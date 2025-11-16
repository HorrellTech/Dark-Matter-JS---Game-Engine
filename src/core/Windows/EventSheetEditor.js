/**
 * EventSheetEditor - Visual programming system for creating game logic
 * 
 * =============================================================================
 * HOW TO ADD NEW ELEMENTS TO THE EVENT SHEET EDITOR
 * =============================================================================
 * 
 * This class provides a visual event-based programming system. To extend it:
 * 
 * 1. ADDING NEW CONDITIONS
 * -------------------------
 * Add definitions to the array returned by getConditionDefinitions() method.
 * Each condition definition has the following structure:
 * 
 * {
 *     type: 'uniqueConditionType',           // Unique identifier
 *     name: 'Condition Name',                // Display name
 *     description: 'What this condition does', // Tooltip/description
 *     category: 'Input',                     // Optional: grouping category
 *     inputs: [                              // Parameters for the condition
 *         {
 *             name: 'paramName',             // Parameter identifier
 *             type: 'string',                // 'string', 'number', 'boolean'
 *             label: 'Display Label',        // UI label
 *             default: 'defaultValue',       // Default value
 *             options: ['opt1', 'opt2'],     // Optional: dropdown options
 *             description: 'Parameter help'  // Optional: parameter help text
 *         }
 *     ],
 *     toJavascriptCode: (params, element, indent = '') => {
 *         // Return JavaScript code string for this condition
 *         return `${indent}someConditionCheck()`;
 *     }
 * }
 * 
 * For NESTED CONDITIONS (if/and/or blocks):
 * Add these properties:
 *     supportsNested: true,
 *     supportsNestedConditions: true,  // Can contain conditions
 *     supportsNestedActions: true,     // Can contain actions
 *     supportsElse: true,              // Supports else block (optional)
 * 
 * 2. ADDING NEW ACTIONS
 * ----------------------
 * Add definitions to the array returned by getActionDefinitions() method.
 * Structure is identical to conditions:
 * 
 * {
 *     type: 'uniqueActionType',
 *     name: 'Action Name',
 *     description: 'What this action does',
 *     category: 'Movement',              // Optional: 'Drawing', 'Movement', etc.
 *     inputs: [ same as conditions  ],
 *     toJavascriptCode: (params, element, indent = '') => {
 *         return `${indent}someAction();`;
 *     }
 * }
 * 
 * 3. ADDING NEW EVENT TYPES
 * --------------------------
 * Edit the eventTypes array in the createEventElement() method (around line 718):
 * const eventTypes = ['start', 'loop', 'draw', 'onDestroy', 'preload', 'beginLoop', 'endLoop'];
 * 
 * These correspond to module lifecycle methods. Add any new lifecycle methods here.
 * 
 * 4. DRAWING ACTIONS - IMPORTANT NOTE
 * ------------------------------------
 * All drawing actions use the game object's position as the origin (0, 0).
 * The x and y parameters are OFFSETS from the game object's center position.
 * 
 * For example:
 * - drawCircle(x: 0, y: 0, radius: 50) draws at the game object's position
 * - drawCircle(x: 10, y: -20, radius: 50) draws 10 pixels right, 20 pixels up from center
 * 
 * The drawing context is automatically translated to the game object's position
 * in the generated draw() method, so all drawing coordinates are relative.
 * 
 * 5. ADDING NEW DRAWING ACTIONS WITH PREVIEW SUPPORT
 * ---------------------------------------------------
 * To add a new drawing action that shows a visual preview:
 * 
 * Step 1: Add the action definition in getActionDefinitions() with category: 'Drawing'
 * Step 2: Add a case for your action in the renderDrawingAction() method (around line 4330)
 *         This renders the preview in the small canvas thumbnails
 * Step 3: The toJavascriptCode function should add a comment at the start explaining what
 *         will be drawn, formatted as:
 *         `${indent}// Draw [description of what will be drawn]\n${indent}[your code]`
 * 
 * Example of adding a new drawing action:
 * 
 * In getActionDefinitions():
 * {
 *     type: 'drawCustomShape',
 *     name: 'Draw Custom Shape',
 *     description: 'Draw a custom shape',
 *     category: 'Drawing',
 *     inputs: [
 *         { name: 'x', type: 'number', label: 'X Offset', default: 0 },
 *         { name: 'y', type: 'number', label: 'Y Offset', default: 0 },
 *         { name: 'color', type: 'string', label: 'Color', default: '#ffffff' }
 *     ],
 *     toJavascriptCode: (params, element, indent = '') => {
 *         let code = `${indent}// Draw custom shape at offset (${params.x || 0}, ${params.y || 0})\n`;
 *         code += `${indent}ctx.fillStyle = "${params.color || '#ffffff'}";\n`;
 *         code += `${indent}// ... your drawing code here`;
 *         return code;
 *     }
 * }
 * 
 * In renderDrawingAction() switch statement:
 * case 'drawCustomShape': {
 *     const x = params.x || 0;
 *     const y = params.y || 0;
 *     // Scale to fit preview canvas
 *     const scale = Math.min(canvasWidth, canvasHeight) / 100;
 *     ctx.fillStyle = params.color || '#ffffff';
 *     // ... your preview rendering code here
 *     break;
 * }
 * 
 * =============================================================================
 * 
 * Features:
 * - Drag and drop events, conditions, and actions
 * - Visual event sheet interface
 * - Real-time JavaScript code generation
 * - Module code export
 * - Project management (save/load)
 * - Nested conditions and actions
 * - Multiple view sizes (small, medium, large)
 * - Undo/Redo system (Ctrl+Z / Ctrl+Y)
 */
class EventSheetEditor extends EditorWindow {
    static namespace = "Tools";
    static description = "Visual event-based programming system";
    static iconClass = "fas fa-project-diagram";
    static color = "#e7db6c";

    constructor() {
        super("Event Sheet Editor", {
            width: 1200,
            height: 800,
            resizable: true,
            modal: false,
            closable: true,
            className: 'event-sheet-editor'
        });

        // Event sheet data
        this.events = [];
        this.selectedEvent = null;
        this.selectedElement = null;
        this.draggedElement = null;

        // Property definitions
        this.properties = [];

        // Undo/Redo system
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;

        // UI elements
        this.toolbar = null;
        this.tabContainer = null;
        this.eventSheetTab = null;
        this.codeTab = null;
        this.propertiesTab = null;
        this.eventSheetView = null;
        this.codeView = null;
        this.propertiesView = null;
        this.propertyModal = null;
        this.currentTab = 'eventSheet';

        // View size: 'small', 'medium', 'large'
        this.viewSize = 'medium';

        // Project data
        this.projectName = "NewModule";
        this.moduleNamespace = "Custom";
        this.moduleDescription = "Generated from Event Sheet";

        this.setupUI();
        this.setupUndoRedoListeners();
    }

    /**
     * Setup keyboard shortcuts for undo/redo
     */
    setupUndoRedoListeners() {
        this._undoRedoHandler = (e) => {
            // Only handle if this window is active
            if (!this.element || this.element.style.display === 'none') return;

            // Ctrl+Z for undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            // Ctrl+Y or Ctrl+Shift+Z for redo
            else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                e.preventDefault();
                this.redo();
            }
        };

        document.addEventListener('keydown', this._undoRedoHandler);
    }

    /**
     * Save current state to undo stack
     */
    saveState() {
        // Deep clone the current state
        const state = {
            events: JSON.parse(JSON.stringify(this.events)),
            projectName: this.projectName,
            moduleNamespace: this.moduleNamespace,
            moduleDescription: this.moduleDescription,
            properties: JSON.parse(JSON.stringify(this.properties))
        };

        this.undoStack.push(state);

        // Limit undo stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }

        // Clear redo stack when new action is performed
        this.redoStack = [];

        // Update toolbar button states
        this.updateUndoRedoButtons();
    }

    /**
     * Undo the last action
     */
    undo() {
        if (this.undoStack.length === 0) {
            console.log('Nothing to undo');
            return;
        }

        // Save current state to redo stack
        const currentState = {
            events: JSON.parse(JSON.stringify(this.events)),
            projectName: this.projectName,
            moduleNamespace: this.moduleNamespace,
            moduleDescription: this.moduleDescription,
            properties: JSON.parse(JSON.stringify(this.properties))
        };
        this.redoStack.push(currentState);

        // Restore previous state
        const previousState = this.undoStack.pop();
        this.events = previousState.events;
        this.projectName = previousState.projectName;
        this.moduleNamespace = previousState.moduleNamespace;
        this.moduleDescription = previousState.moduleDescription;
        this.properties = previousState.properties;

        // Update UI
        this.renderEventSheet();
        this.updateCode();
        this.updateUndoRedoButtons();

        console.log('Undo: Restored previous state');
    }

    /**
     * Redo the last undone action
     */
    redo() {
        if (this.redoStack.length === 0) {
            console.log('Nothing to redo');
            return;
        }

        // Save current state to undo stack
        const currentState = {
            events: JSON.parse(JSON.stringify(this.events)),
            projectName: this.projectName,
            moduleNamespace: this.moduleNamespace,
            moduleDescription: this.moduleDescription,
            properties: JSON.parse(JSON.stringify(this.properties))
        };
        this.undoStack.push(currentState);

        // Restore next state
        const nextState = this.redoStack.pop();
        this.events = nextState.events;
        this.projectName = nextState.projectName;
        this.moduleNamespace = nextState.moduleNamespace;
        this.moduleDescription = nextState.moduleDescription;
        this.properties = nextState.properties;

        // Update UI
        this.renderEventSheet();
        this.updateCode();
        this.updateUndoRedoButtons();

        console.log('Redo: Restored next state');
    }

    /**
     * Update undo/redo button states
     */
    updateUndoRedoButtons() {
        if (this.undoBtn) {
            this.undoBtn.disabled = this.undoStack.length === 0;
            this.undoBtn.style.opacity = this.undoStack.length === 0 ? '0.5' : '1';
            this.undoBtn.style.cursor = this.undoStack.length === 0 ? 'not-allowed' : 'pointer';
        }

        if (this.redoBtn) {
            this.redoBtn.disabled = this.redoStack.length === 0;
            this.redoBtn.style.opacity = this.redoStack.length === 0 ? '0.5' : '1';
            this.redoBtn.style.cursor = this.redoStack.length === 0 ? 'not-allowed' : 'pointer';
        }
    }

    /**
     * Get available keys from InputManager
     */
    getAvailableKeys() {
        const keys = [];

        // Common keys organized by category
        const categories = {
            'Letters': ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
            'Numbers': ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            'Arrows': ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'],
            'Special': ['space', 'enter', 'escape', 'backspace', 'tab', 'shift', 'control', 'alt'],
            'Function': ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12']
        };

        // Flatten into single array with category labels
        Object.entries(categories).forEach(([category, categoryKeys]) => {
            keys.push(`--- ${category} ---`);
            keys.push(...categoryKeys);
        });

        return keys;
    }

    setupUI() {
        this.clearContent();

        // Inject CSS styles for drag-and-drop indicators
        this.injectDragDropStyles();

        // Create a container structure with fixed header and scrollable content
        this.content.style.cssText = `
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
    `;

        this.createToolbar();
        this.createTabs();

        // Create scrollable content container
        this.contentContainer = document.createElement('div');
        this.contentContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        position: relative;
    `;
        this.content.appendChild(this.contentContainer);

        this.createEventSheetView();
        this.createPropertiesView();
        this.createCodeView();
        this.createPropertyModal();

        // Show event sheet by default
        this.switchTab('eventSheet');
    }

    createToolbar() {
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'event-sheet-toolbar';
        this.toolbar.style.cssText = `
        display: flex;
        gap: 8px;
        padding: 10px;
        background: #2a2a2a;
        border-bottom: 1px solid #444;
        flex-wrap: wrap;
        align-items: center;
        flex-shrink: 0;
    `;

        // Project name input
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Module Name:';
        nameLabel.style.cssText = 'color: #fff; font-size: 12px; margin-right: 4px;';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = this.projectName;
        nameInput.style.cssText = `
            padding: 6px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 4px;
            width: 150px;
        `;
        nameInput.addEventListener('input', (e) => {
            this.saveState();
            this.projectName = e.target.value;
            this.updateCode();
        });

        // View size selector
        const sizeLabel = document.createElement('label');
        sizeLabel.textContent = 'View:';
        sizeLabel.style.cssText = 'color: #fff; font-size: 12px; margin-left: 8px; margin-right: 4px;';

        const sizeSelect = document.createElement('select');
        sizeSelect.style.cssText = `
            padding: 6px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 4px;
        `;
        ['small', 'medium', 'large'].forEach(size => {
            const option = document.createElement('option');
            option.value = size;
            option.textContent = size.charAt(0).toUpperCase() + size.slice(1);
            option.selected = this.viewSize === size;
            sizeSelect.appendChild(option);
        });
        sizeSelect.addEventListener('change', (e) => {
            this.viewSize = e.target.value;
            this.renderEventSheet();
        });

        // Undo button
        this.undoBtn = this.createToolbarButton('↶ Undo', () => {
            this.undo();
        });
        this.undoBtn.title = 'Undo (Ctrl+Z)';
        this.undoBtn.disabled = true;
        this.undoBtn.style.opacity = '0.5';

        // Redo button
        this.redoBtn = this.createToolbarButton('↷ Redo', () => {
            this.redo();
        });
        this.redoBtn.title = 'Redo (Ctrl+Y)';
        this.redoBtn.disabled = true;
        this.redoBtn.style.opacity = '0.5';

        // Load examples button
        const examplesBtn = this.createToolbarButton('📚 Examples', () => {
            this.showExampleSelector();
        });
        examplesBtn.style.background = '#e7db6c';
        examplesBtn.style.color = '#000';
        examplesBtn.title = 'Load example projects';

        // Add event button
        const addEventBtn = this.createToolbarButton('+ Add Event', () => {
            this.addEvent();
        });

        // Generate code button
        const generateBtn = this.createToolbarButton('Generate Code', () => {
            this.updateCode();
            this.switchTab('code');
        });

        // Copy code button
        const copyBtn = this.createToolbarButton('Copy Code', () => {
            this.copyCodeToClipboard();
        });

        // Save project button
        const saveBtn = this.createToolbarButton('Save Project', () => {
            this.saveProjectToFileBrowser();
        });

        // Load project button
        const loadBtn = this.createToolbarButton('Load Project', () => {
            this.loadProjectFromFileBrowser();
        });

        // Export to module file button
        const exportBtn = this.createToolbarButton('Export Module', () => {
            this.exportToFileBrowser();
        });

        // Clear all button
        const clearBtn = this.createToolbarButton('Clear All', () => {
            if (confirm('Are you sure you want to clear all events?')) {
                this.saveState();
                this.events = [];
                this.renderEventSheet();
                this.updateCode();
            }
        });

        this.toolbar.appendChild(nameLabel);
        this.toolbar.appendChild(nameInput);
        this.toolbar.appendChild(sizeLabel);
        this.toolbar.appendChild(sizeSelect);
        this.toolbar.appendChild(this.undoBtn);
        this.toolbar.appendChild(this.redoBtn);
        this.toolbar.appendChild(addEventBtn);
        this.toolbar.appendChild(examplesBtn);
        this.toolbar.appendChild(generateBtn);
        this.toolbar.appendChild(copyBtn);
        this.toolbar.appendChild(saveBtn);
        this.toolbar.appendChild(loadBtn);
        this.toolbar.appendChild(exportBtn);
        this.toolbar.appendChild(clearBtn);

        this.content.appendChild(this.toolbar);
    }

    createToolbarButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            padding: 6px 12px;
            background: #4a7c59;
            border: none;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        `;
        btn.addEventListener('mouseenter', () => btn.style.background = '#5a8c69');
        btn.addEventListener('mouseleave', () => btn.style.background = '#4a7c59');
        btn.addEventListener('click', onClick);
        return btn;
    }

    createTabs() {
        this.tabContainer = document.createElement('div');
        this.tabContainer.style.cssText = `
        display: flex;
        gap: 2px;
        background: #1e1e1e;
        border-bottom: 1px solid #444;
        flex-shrink: 0;
    `;

        this.eventSheetTab = this.createTab('Event Sheet', 'eventSheet');
        this.propertiesTab = this.createTab('Properties', 'properties');
        this.codeTab = this.createTab('Generated Code', 'code');

        this.tabContainer.appendChild(this.eventSheetTab);
        this.tabContainer.appendChild(this.propertiesTab);
        this.tabContainer.appendChild(this.codeTab);

        this.content.appendChild(this.tabContainer);
    }

    createTab(label, tabName) {
        const tab = document.createElement('div');
        tab.className = 'event-sheet-tab';
        tab.textContent = label;
        tab.style.cssText = `
            padding: 10px 20px;
            cursor: pointer;
            color: #aaa;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        `;

        tab.addEventListener('click', () => this.switchTab(tabName));
        return tab;
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        // Update tab styles
        [this.eventSheetTab, this.propertiesTab, this.codeTab].forEach(tab => {
            if (tab) {
                tab.style.background = '#2a2a2a';
                tab.style.color = '#999';
            }
        });

        const activeTab = tabName === 'eventSheet' ? this.eventSheetTab :
            tabName === 'properties' ? this.propertiesTab :
                this.codeTab;
        if (activeTab) {
            activeTab.style.background = '#333';
            activeTab.style.color = '#fff';
        }

        // Show/hide views
        if (this.eventSheetView) this.eventSheetView.style.display = tabName === 'eventSheet' ? 'block' : 'none';
        if (this.propertiesView) this.propertiesView.style.display = tabName === 'properties' ? 'block' : 'none';
        if (this.codeView) this.codeView.style.display = tabName === 'code' ? 'block' : 'none';

        if (tabName === 'properties') {
            this.renderPropertiesView();
        } else if (tabName === 'code') {
            // Initialize CodeMirror on first view
            if (!this.codeEditorInitialized) {
                this.initCodeEditor();
            }
            this.updateCode();
            // Refresh CodeMirror when switching to code view
            if (this.codeEditor) {
                setTimeout(() => {
                    this.codeEditor.refresh();
                }, 50);
            }
        }
    }

    /**
     * Inject CSS styles for drag-and-drop visual indicators
     */
    injectDragDropStyles() {
        // Check if styles already exist
        if (document.getElementById('event-sheet-drag-styles')) return;

        const style = document.createElement('style');
        style.id = 'event-sheet-drag-styles';
        style.textContent = `
            .event-sheet-editor .condition-element,
            .event-sheet-editor .action-element {
                position: relative;
                transition: all 0.2s ease;
            }

            .event-sheet-editor .condition-element.drag-over-top::before,
            .event-sheet-editor .action-element.drag-over-top::before {
                content: '';
                position: absolute;
                top: -2px;
                left: 0;
                right: 0;
                height: 3px;
                background: #4a7c59;
                border-radius: 2px;
                box-shadow: 0 0 8px #4a7c59;
                z-index: 1000;
                animation: dragPulse 0.6s ease-in-out infinite;
            }

            .event-sheet-editor .condition-element.drag-over-bottom::after,
            .event-sheet-editor .action-element.drag-over-bottom::after {
                content: '';
                position: absolute;
                bottom: -2px;
                left: 0;
                right: 0;
                height: 3px;
                background: #4a7c59;
                border-radius: 2px;
                box-shadow: 0 0 8px #4a7c59;
                z-index: 1000;
                animation: dragPulse 0.6s ease-in-out infinite;
            }

            @keyframes dragPulse {
                0%, 100% {
                    opacity: 0.6;
                    transform: scaleY(1);
                }
                50% {
                    opacity: 1;
                    transform: scaleY(1.5);
                }
            }

            .event-sheet-editor .condition-element[draggable="true"]:hover,
            .event-sheet-editor .action-element[draggable="true"]:hover {
                cursor: move;
                transform: translateX(2px);
            }
        `;
        document.head.appendChild(style);
    }

    renderPropertiesView() {
        if (!this.propertiesView) return;

        this.propertiesView.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #4a7c59;
    `;

        const title = document.createElement('h2');
        title.textContent = 'Module Properties';
        title.style.cssText = 'margin: 0; color: #fff; font-size: 18px;';

        const addBtn = this.createToolbarButton('+ Add Property', () => {
            this.showPropertyEditor(null);
        });

        header.appendChild(title);
        header.appendChild(addBtn);
        this.propertiesView.appendChild(header);

        // Properties list
        if (this.properties.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = `
            text-align: center;
            padding: 40px;
            color: #888;
            font-style: italic;
        `;
            empty.textContent = 'No properties defined. Click "Add Property" to create one.';
            this.propertiesView.appendChild(empty);
            return;
        }

        const propertyList = document.createElement('div');
        propertyList.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';

        this.properties.forEach((prop, index) => {
            const propCard = this.createPropertyCard(prop, index);
            propertyList.appendChild(propCard);
        });

        this.propertiesView.appendChild(propertyList);
    }

    createPropertyCard(prop, index) {
        const card = document.createElement('div');
        card.style.cssText = `
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 6px;
        padding: 15px;
        transition: all 0.2s;
    `;

        card.addEventListener('mouseenter', () => {
            card.style.borderColor = '#4a7c59';
            card.style.background = '#2f2f2f';
        });

        card.addEventListener('mouseleave', () => {
            card.style.borderColor = '#444';
            card.style.background = '#2a2a2a';
        });

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';

        const nameType = document.createElement('div');
        nameType.style.cssText = 'flex: 1;';

        const name = document.createElement('div');
        name.textContent = prop.name;
        name.style.cssText = 'color: #fff; font-size: 16px; font-weight: bold; margin-bottom: 4px;';

        const typeBadgeContainer = document.createElement('div');
        typeBadgeContainer.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;';

        const type = document.createElement('span');
        type.textContent = prop.type;
        type.style.cssText = `
        background: #4a7c59;
        color: #fff;
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: bold;
    `;
        typeBadgeContainer.appendChild(type);

        // Add style badge if present
        if (prop.style) {
            const styleBadge = document.createElement('span');
            styleBadge.textContent = prop.style;
            styleBadge.style.cssText = `
            background: #5b7cb6;
            color: #fff;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
        `;
            typeBadgeContainer.appendChild(styleBadge);
        }

        nameType.appendChild(name);
        nameType.appendChild(typeBadgeContainer);

        const controls = document.createElement('div');
        controls.style.cssText = 'display: flex; gap: 8px;';

        const editBtn = this.createIconButton('✏️', 'Edit', () => {
            this.showPropertyEditor(prop, index);
        });

        const deleteBtn = this.createIconButton('✕', 'Delete', () => {
            if (confirm(`Delete property "${prop.name}"?`)) {
                this.properties.splice(index, 1);
                this.renderPropertiesView();
                this.updateCode();
            }
        });

        controls.appendChild(editBtn);
        controls.appendChild(deleteBtn);

        header.appendChild(nameType);
        header.appendChild(controls);
        card.appendChild(header);

        // Property details
        const details = document.createElement('div');
        details.style.cssText = 'color: #aaa; font-size: 12px;';

        const defaultValue = document.createElement('div');
        defaultValue.innerHTML = `<strong>Default:</strong> ${this.formatPropertyValue(prop.defaultValue, prop.type)}`;
        defaultValue.style.marginBottom = '4px';

        const exposed = document.createElement('div');
        exposed.innerHTML = `<strong>Exposed:</strong> ${prop.exposed ? '✓ Yes' : '✗ No'}`;
        exposed.style.marginBottom = '4px';
        if (prop.exposed) {
            exposed.style.color = '#4a7c59';
        }

        const serialized = document.createElement('div');
        serialized.innerHTML = `<strong>Serialized:</strong> ${prop.serialized ? '✓ Yes' : '✗ No'}`;
        serialized.style.marginBottom = '4px';
        if (prop.serialized) {
            serialized.style.color = '#4a7c59';
        }

        // Show onChange status
        if (prop.onChange) {
            const onChangeStatus = document.createElement('div');
            onChangeStatus.innerHTML = `<strong>onChange:</strong> ✓ Yes`;
            onChangeStatus.style.marginBottom = '4px';
            onChangeStatus.style.color = '#4a7c59';
            details.appendChild(onChangeStatus);
        }

        details.appendChild(defaultValue);
        details.appendChild(exposed);
        details.appendChild(serialized);

        if (prop.description) {
            const desc = document.createElement('div');
            desc.style.cssText = 'margin-top: 8px; padding-top: 8px; border-top: 1px solid #333; color: #999; font-style: italic;';
            desc.textContent = prop.description;
            details.appendChild(desc);
        }

        card.appendChild(details);
        return card;
    }

    createPropertiesView() {
        this.propertiesView = document.createElement('div');
        this.propertiesView.style.cssText = `
            display: none;
            padding: 20px;
            background: #1e1e1e;
            min-height: 100%;
        `;

        this.contentContainer.appendChild(this.propertiesView);
    }

    createEventSheetView() {
        this.eventSheetView = document.createElement('div');
        this.eventSheetView.className = 'event-sheet-view';
        this.eventSheetView.style.cssText = `
        padding: 20px;
        background: #1e1e1e;
        min-height: 100%;
    `;

        this.contentContainer.appendChild(this.eventSheetView);
        this.renderEventSheet();
    }

    createCodeView() {
        this.codeView = document.createElement('div');
        this.codeView.style.cssText = `
            padding: 20px;
            background: #1e1e1e;
            display: none;
            min-height: 100%;
        `;

        const codeTextarea = document.createElement('textarea');
        codeTextarea.className = 'generated-code';
        codeTextarea.style.cssText = `
            width: 100%;
            height: 600px;
            background: #282828;
            color: #d4d4d4;
            border: 1px solid #444;
            border-radius: 4px;
            padding: 15px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 13px;
            line-height: 1.5;
            resize: vertical;
            display: none;
        `;
        codeTextarea.readOnly = true;

        this.codeView.appendChild(codeTextarea);
        this.contentContainer.appendChild(this.codeView);

        // Store reference to textarea
        this.codeTextarea = codeTextarea;
        this.codeEditor = null; // Will hold CodeMirror instance

        // Initialize CodeMirror when first switching to code view
        this.codeEditorInitialized = false;
    }

    async initCodeEditor() {
        if (this.codeEditorInitialized || !this.codeTextarea) {
            return;
        }

        // Load CodeMirror if not already loaded
        if (!window.CodeMirror) {
            await this.loadCodeMirrorDependencies();
        }

        if (!window.CodeMirror) {
            console.error('Failed to load CodeMirror');
            return;
        }

        // Create CodeMirror instance
        try {
            this.codeEditor = CodeMirror.fromTextArea(this.codeTextarea, {
                mode: "javascript",
                theme: "dracula",
                lineNumbers: true,
                readOnly: true,
                lineWrapping: false,
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                extraKeys: {
                    "Ctrl-F": "findPersistent",
                    "Ctrl-H": "replace"
                }
            });

            // Set initial value
            this.codeEditor.setValue(this.codeTextarea.value || '');

            // Refresh after a short delay
            setTimeout(() => {
                if (this.codeEditor) {
                    this.codeEditor.refresh();
                }
            }, 100);

            this.codeEditorInitialized = true;
        } catch (error) {
            console.error('Error creating CodeMirror instance for code view:', error);
        }
    }

    createPropertyModal() {
        this.propertyModal = document.createElement('div');
        this.propertyModal.className = 'property-modal';
        this.propertyModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2a2a2a;
            border: 1px solid #555;
            border-radius: 8px;
            padding: 20px;
            min-width: 400px;
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            z-index: 10000;
            display: none;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;

        document.body.appendChild(this.propertyModal);
    }

    addEvent() {
        // Show modal to choose event type
        this.showEventTypePicker();
    }

    showEventTypePicker() {
        this.propertyModal.innerHTML = '';
        this.propertyModal.style.display = 'block';

        const title = document.createElement('h3');
        title.textContent = 'Select Event Type';
        title.style.cssText = 'margin: 0 0 15px 0; color: #fff;';
        this.propertyModal.appendChild(title);

        const eventTypes = [
            { value: 'start', label: 'Start', description: 'Called once when the module is initialized' },
            { value: 'loop', label: 'Loop', description: 'Called every frame (receives deltaTime)' },
            { value: 'draw', label: 'Draw', description: 'Called for rendering (receives ctx)' },
            { value: 'onDestroy', label: 'On Destroy', description: 'Called when the module is destroyed' },
            { value: 'preload', label: 'Preload', description: 'Called before start to load assets' },
            { value: 'beginLoop', label: 'Begin Loop', description: 'Called at the start of each frame' },
            { value: 'endLoop', label: 'End Loop', description: 'Called at the end of each frame' },
            { value: 'melodicode', label: 'MelodiCode', description: 'Build a MelodiCode music script that can be played' },
            { value: 'custom', label: 'Custom Event', description: 'Create a custom method with parameters' }
        ];

        const list = document.createElement('div');
        list.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; max-height: 500px; overflow-y: auto;';

        eventTypes.forEach(eventType => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 12px;
                background: #2a2a2a;
                border: 1px solid #444;
                border-left: 3px solid #4a7c59;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            `;

            item.addEventListener('mouseenter', () => {
                item.style.background = '#333';
                item.style.borderColor = '#4a7c59';
            });

            item.addEventListener('mouseleave', () => {
                item.style.background = '#2a2a2a';
                item.style.borderColor = '#444';
            });

            const itemTitle = document.createElement('div');
            itemTitle.textContent = eventType.label;
            itemTitle.style.cssText = 'color: #fff; font-weight: bold; margin-bottom: 4px;';

            const itemDesc = document.createElement('div');
            itemDesc.textContent = eventType.description;
            itemDesc.style.cssText = 'color: #aaa; font-size: 11px;';

            item.appendChild(itemTitle);
            item.appendChild(itemDesc);

            item.addEventListener('click', () => {
                if (eventType.value === 'custom') {
                    this.showCustomEventEditor();
                } else {
                    const newEvent = {
                        id: this.generateId(),
                        type: 'event',
                        name: eventType.value,
                        conditions: [],
                        actions: []
                    };
                    this.events.push(newEvent);
                    this.propertyModal.style.display = 'none';
                    this.renderEventSheet();
                    this.updateCode();
                }
            });

            list.appendChild(item);
        });

        this.propertyModal.appendChild(list);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Cancel';
        closeBtn.style.cssText = `
            padding: 8px 16px;
            background: #555;
            border: none;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
        `;
        closeBtn.addEventListener('click', () => {
            this.propertyModal.style.display = 'none';
        });
        this.propertyModal.appendChild(closeBtn);
    }

    showCustomEventEditor(event = null, eventIndex = -1) {
        if (eventType.value === 'melodicode') {
            const newEvent = {
                id: this.generateId(),
                type: 'event',
                name: 'melodicode',
                melodicodeName: 'buildMelodiCodeScript', // Default method name
                conditions: [],
                actions: []
            };

            // Show a dialog to name the melodicode method
            const methodName = prompt('Enter a name for this MelodiCode builder method:', 'buildMelodiCodeScript');
            if (methodName && methodName.trim()) {
                newEvent.melodicodeName = methodName.trim();
                this.events.push(newEvent);
                this.propertyModal.style.display = 'none';
                this.renderEventSheet();
                this.updateCode();
            }
        } else if (eventType.value === 'custom') {
            this.showCustomEventEditor();
        }
        const isNew = event === null;
        if (isNew) {
            event = {
                id: this.generateId(),
                type: 'custom',
                name: 'customMethod',
                params: '',
                conditions: [],
                actions: []
            };
        }

        this.propertyModal.innerHTML = '';
        this.propertyModal.style.display = 'block';

        const title = document.createElement('h3');
        title.textContent = isNew ? 'Create Custom Event' : 'Edit Custom Event';
        title.style.cssText = 'margin: 0 0 15px 0; color: #fff;';
        this.propertyModal.appendChild(title);

        const form = document.createElement('div');
        form.style.cssText = 'margin-bottom: 15px;';

        // Method name
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Method Name';
        nameLabel.style.cssText = 'display: block; color: #fff; margin-bottom: 6px; font-size: 13px;';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = event.name || 'customMethod';
        nameInput.placeholder = 'e.g., onCollision, takeDamage, etc.';
        nameInput.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 4px;
            margin-bottom: 12px;
        `;

        // Parameters
        const paramsLabel = document.createElement('label');
        paramsLabel.textContent = 'Parameters (comma-separated)';
        paramsLabel.style.cssText = 'display: block; color: #fff; margin-bottom: 6px; font-size: 13px;';

        const paramsInput = document.createElement('input');
        paramsInput.type = 'text';
        paramsInput.value = event.params || '';
        paramsInput.placeholder = 'e.g., target, amount, type';
        paramsInput.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 4px;
        `;

        const paramsDesc = document.createElement('div');
        paramsDesc.textContent = 'Leave empty for no parameters';
        paramsDesc.style.cssText = 'color: #888; font-size: 11px; margin-top: 4px;';

        form.appendChild(nameLabel);
        form.appendChild(nameInput);
        form.appendChild(paramsLabel);
        form.appendChild(paramsInput);
        form.appendChild(paramsDesc);

        this.propertyModal.appendChild(form);

        const buttons = document.createElement('div');
        buttons.style.cssText = 'display: flex; gap: 10px;';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = isNew ? 'Create' : 'Save';
        saveBtn.style.cssText = `
            flex: 1;
            padding: 8px 16px;
            background: #4a7c59;
            border: none;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
        `;
        saveBtn.addEventListener('click', () => {
            event.name = nameInput.value || 'customMethod';
            event.params = paramsInput.value || '';
            event.type = 'custom';

            if (isNew) {
                this.events.push(event);
            }

            this.propertyModal.style.display = 'none';
            this.renderEventSheet();
            this.updateCode();
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            flex: 1;
            padding: 8px 16px;
            background: #555;
            border: none;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
        `;
        cancelBtn.addEventListener('click', () => {
            this.propertyModal.style.display = 'none';
        });

        buttons.appendChild(saveBtn);
        buttons.appendChild(cancelBtn);
        this.propertyModal.appendChild(buttons);
    }

    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    renderEventSheet() {
        this.eventSheetView.innerHTML = '';

        if (this.events.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.style.cssText = `
                text-align: center;
                color: #888;
                padding: 60px 20px;
                font-size: 16px;
            `;
            emptyState.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 20px;">📋</div>
                <div>No events yet. Click "Add Event" to start building your logic.</div>
            `;
            this.eventSheetView.appendChild(emptyState);
            // Don't return - continue to add the button
        } else {
            this.events.forEach((event, index) => {
                const eventElement = this.createEventElement(event, index);
                this.eventSheetView.appendChild(eventElement);
            });
        }

        // Add "Add Event" button at the bottom (always shown)
        const addEventButton = document.createElement('button');
        addEventButton.textContent = '+ Add Event';
        addEventButton.style.cssText = `
            display: block;
            width: 100%;
            padding: 12px;
            margin-top: 15px;
            background: #2a2a2a;
            border: 2px dashed #4a7c59;
            color: #4a7c59;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.2s;
        `;

        addEventButton.addEventListener('mouseenter', () => {
            addEventButton.style.background = '#3a3a3a';
            addEventButton.style.borderColor = '#5a8c69';
            addEventButton.style.color = '#5a8c69';
            addEventButton.style.transform = 'translateY(-2px)';
        });

        addEventButton.addEventListener('mouseleave', () => {
            addEventButton.style.background = '#2a2a2a';
            addEventButton.style.borderColor = '#4a7c59';
            addEventButton.style.color = '#4a7c59';
            addEventButton.style.transform = 'translateY(0)';
        });

        addEventButton.addEventListener('click', () => {
            this.addEvent();
        });

        this.eventSheetView.appendChild(addEventButton);
    }

    createEventElement(event, index) {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event-block';
        eventDiv.dataset.eventId = event.id;

        const styles = this.getEventBlockStyles();
        eventDiv.style.cssText = styles.eventBlock;

        // Event header
        const header = document.createElement('div');
        header.style.cssText = styles.header;

        // Check if this is a custom event
        if (event.type === 'custom') {
            const customTitle = document.createElement('div');
            customTitle.style.cssText = `
                background: #333;
                color: #fff;
                border: 1px solid #555;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 13px;
                font-weight: bold;
                flex: 1;
                display: flex;
                align-items: center;
                gap: 8px;
            `;

            const methodName = document.createElement('span');
            methodName.textContent = event.name;
            methodName.style.cssText = 'color: #4a7c59;';

            const paramsSpan = document.createElement('span');
            paramsSpan.textContent = `(${event.params || ''})`;
            paramsSpan.style.cssText = 'color: #aaa;';

            const editIndicator = document.createElement('span');
            editIndicator.innerHTML = '✏️';
            editIndicator.style.cssText = 'font-size: 12px; cursor: pointer;';
            editIndicator.title = 'Edit custom event';

            customTitle.appendChild(methodName);
            customTitle.appendChild(paramsSpan);
            customTitle.appendChild(editIndicator);

            customTitle.addEventListener('click', () => {
                this.showCustomEventEditor(event, index);
            });

            header.appendChild(customTitle);
        } else {
            const eventTitle = document.createElement('select');
            eventTitle.style.cssText = styles.eventTitle;

            const eventTypes = ['start', 'loop', 'draw', 'onDestroy', 'preload', 'beginLoop', 'endLoop', 'melodicode'];
            eventTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                option.selected = event.name === type;
                eventTitle.appendChild(option);
            });

            eventTitle.addEventListener('change', (e) => {
                event.name = e.target.value;
                this.renderEventSheet();
                this.updateCode();
            });

            header.appendChild(eventTitle);

            // Add combined preview for draw events
            if (event.name === 'draw') {
                const drawingActions = this.getAllDrawingActions(event.actions);
                if (drawingActions.length > 0) {
                    const combinedPreview = this.createCombinedDrawingPreview(drawingActions, 64, 64);
                    if (combinedPreview) {
                        combinedPreview.style.cssText = `
                            cursor: pointer;
                            border: 2px solid #4a7c59;
                            border-radius: 4px;
                            background: #1a1a1a;
                            margin-left: 12px;
                        `;
                        combinedPreview.title = 'Combined preview of all drawing actions (click for larger view)';
                        combinedPreview.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.showCombinedDrawingPreviewModal(drawingActions);
                        });
                        header.appendChild(combinedPreview);
                    }
                }
            }
        }

        const controls = document.createElement('div');
        controls.style.cssText = 'display: flex; gap: 8px;';

        const deleteBtn = this.createIconButton('🗑️', 'Delete Event', () => {
            this.events.splice(index, 1);
            this.renderEventSheet();
            this.updateCode();
        });

        controls.appendChild(deleteBtn);
        header.appendChild(controls);
        eventDiv.appendChild(header);

        // Conditions section
        const conditionsSection = this.createBlockSection(
            'Conditions',
            event.conditions,
            event,
            'conditions',
            '#ffa500',
            0
        );
        eventDiv.appendChild(conditionsSection);

        // Actions section
        const actionsSection = this.createBlockSection(
            'Actions',
            event.actions,
            event,
            'actions',
            '#4a7c59',
            0
        );
        eventDiv.appendChild(actionsSection);

        return eventDiv;
    }

    getEventBlockStyles() {
        const sizes = {
            small: {
                eventBlock: `
                background: #2a2a2a;
                border-left: 2px solid #4a7c59;
                margin-bottom: 4px;
                padding: 2px 4px;
                position: relative;
            `,
                header: `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2px;
            `,
                eventTitle: `
                background: #333;
                color: #fff;
                border: 1px solid #555;
                padding: 2px 4px;
                border-radius: 2px;
                font-size: 10px;
                font-weight: bold;
            `,
                sectionLabel: `
                font-weight: bold;
                margin-bottom: 2px;
                font-size: 9px;
            `,
                container: `
                background: #252525;
                border-left: 1px solid #555;
                padding: 2px 4px;
                margin-bottom: 2px;
                transition: all 0.2s;
            `,
                element: `
                padding: 1px 4px;
                margin-bottom: 1px;
                cursor: move;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 9px;
            `,
                button: `
                padding: 1px 4px;
                font-size: 8px;
                margin-top: 2px;
            `,
                nestedContainer: `
                margin-top: 2px;
                margin-left: 4px;
                border-left: 1px solid #555;
                padding-left: 4px;
            `
            },
            medium: {
                eventBlock: `
                background: #2a2a2a;
                border: 1px solid #4a7c59;
                border-radius: 6px;
                margin-bottom: 12px;
                padding: 10px;
                position: relative;
            `,
                header: `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 1px solid #444;
            `,
                eventTitle: `
                background: #333;
                color: #fff;
                border: 1px solid #555;
                padding: 5px;
                border-radius: 4px;
                font-size: 13px;
                font-weight: bold;
            `,
                sectionLabel: `
                font-weight: bold;
                margin-bottom: 6px;
                font-size: 11px;
            `,
                container: `
                background: #252525;
                border: 1px dashed #555;
                border-radius: 4px;
                padding: 6px;
                margin-bottom: 8px;
                transition: all 0.2s;
            `,
                element: `
                padding: 4px 8px;
                margin-bottom: 3px;
                cursor: move;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 11px;
                border-radius: 3px;
            `,
                button: `
                padding: 3px 8px;
                font-size: 10px;
            `,
                nestedContainer: `
                margin-top: 6px;
                margin-left: 8px;
                border-left: 2px solid #555;
                padding-left: 8px;
            `
            },
            large: {
                eventBlock: `
                background: #2a2a2a;
                border: 2px solid #4a7c59;
                border-radius: 8px;
                margin-bottom: 20px;
                padding: 15px;
                position: relative;
            `,
                header: `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid #444;
            `,
                eventTitle: `
                background: #333;
                color: #fff;
                border: 1px solid #555;
                padding: 6px;
                border-radius: 4px;
                font-size: 14px;
                font-weight: bold;
            `,
                sectionLabel: `
                font-weight: bold;
                margin-bottom: 8px;
                font-size: 13px;
            `,
                container: `
                background: #252525;
                border: 2px dashed #555;
                border-radius: 4px;
                padding: 10px;
                margin-bottom: 15px;
                transition: all 0.2s;
            `,
                element: `
                padding: 8px 12px;
                margin-bottom: 6px;
                cursor: move;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.2s;
                font-size: 13px;
                border-radius: 4px;
            `,
                button: `
                padding: 4px 10px;
                font-size: 11px;
            `,
                nestedContainer: `
                margin-top: 8px;
                margin-left: 10px;
                border-left: 2px solid #555;
                padding-left: 10px;
            `
            }
        };

        return sizes[this.viewSize] || sizes.large;
    }

    createBlockSection(label, items, parentElement, arrayName, color, indentLevel) {
        const styles = this.getEventBlockStyles();
        const section = document.createElement('div');
        section.style.cssText = `margin-left: ${indentLevel * 20}px;`;

        // Section label only (no button in header)
        const sectionLabel = document.createElement('div');
        sectionLabel.textContent = label;
        sectionLabel.style.cssText = styles.sectionLabel + `color: ${color}; margin-bottom: 4px;`;
        section.appendChild(sectionLabel);

        const container = document.createElement('div');
        container.className = arrayName + '-container';
        container.dataset.parentId = parentElement.id;
        container.dataset.arrayName = arrayName;
        container.style.cssText = styles.container + `min-height: ${this.viewSize === 'small' ? '20px' : '40px'};`;

        this.makeDropTarget(container, parentElement, arrayName);

        // Handle undefined or non-array items
        if (!items) {
            items = [];
            // Initialize the array on the parent element
            parentElement[arrayName] = items;
        } else if (!Array.isArray(items)) {
            console.warn(`createBlockSection: items for ${arrayName} is not an array`, items);
            items = [];
            parentElement[arrayName] = items;
        }

        items.forEach((item, itemIndex) => {
            const element = this.createBlockElement(item, parentElement, arrayName, itemIndex, indentLevel, color);
            container.appendChild(element);
        });

        // Add button inside container at the bottom
        const addBtn = this.createSmallButton(`+ Add ${label.slice(0, -1)}`, () => {
            this.showElementPicker(parentElement, arrayName);
        }, styles.button + `
        margin-top: 8px;
        margin-left: 0;
        background: ${color}22;
        border-color: ${color};
        color: ${color};
        align-self: flex-start;
    `);
        container.appendChild(addBtn);

        section.appendChild(container);

        return section;
    }

    createBlockElement(element, parentElement, arrayName, index, indentLevel, color) {
        const styles = this.getEventBlockStyles();
        const elementDef = arrayName === 'conditions' || arrayName.includes('conditions') ?
            this.getConditionDefinition(element.type) :
            this.getActionDefinition(element.type);

        // If not found, try the other definition set (for nested if blocks in actions)
        const def = elementDef || this.getConditionDefinition(element.type) || this.getActionDefinition(element.type);

        const isCondition = def && (arrayName === 'conditions' || arrayName.includes('conditions') || def.supportsNestedConditions);

        const elementDiv = document.createElement('div');
        elementDiv.className = isCondition ? 'condition-element' : 'action-element';
        elementDiv.draggable = true;

        // Store data attributes for reliable comparison
        elementDiv.dataset.itemId = element.id;
        elementDiv.dataset.parentId = parentElement.id;
        elementDiv.dataset.arrayName = arrayName;

        // Different styling for nested blocks vs regular actions
        const isNestedBlock = def && def.supportsNested;

        elementDiv.style.cssText = styles.element + `
        background: ${isCondition ? '#3a3a2a' : '#2a3a2a'};
        border: 1px solid ${isCondition ? '#6a6a4a' : '#4a6a4a'};
        ${isNestedBlock ? 'border-left: 3px solid ' + color + ';' : ''}
    `;

        // Create a drag handle indicator on the left side
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '⋮⋮';
        dragHandle.style.cssText = `
            position: absolute;
            left: 4px;
            top: 50%;
            transform: translateY(-50%);
            color: #666;
            font-size: 14px;
            cursor: move;
            padding: 4px;
            user-select: none;
            z-index: 10;
        `;
        dragHandle.title = 'Drag to reorder';

        // Make the whole element's position relative for the drag handle
        const currentStyle = elementDiv.style.cssText;
        elementDiv.style.cssText = currentStyle + ' position: relative; padding-left: 30px;';

        elementDiv.appendChild(dragHandle);

        // Drag event handlers - IMPROVED VERSION
        const startDrag = (e) => {
            // Only allow dragging from the drag handle or the element itself (not from buttons/inputs)
            const target = e.target;
            const isInteractiveElement = target.tagName === 'BUTTON' ||
                target.tagName === 'INPUT' ||
                target.tagName === 'SELECT' ||
                target.tagName === 'TEXTAREA';

            // If clicking on interactive element (not drag handle), prevent drag
            if (isInteractiveElement && !target.classList.contains('drag-handle') && !target.closest('.drag-handle')) {
                e.preventDefault();
                return false;
            }

            // CRITICAL: Stop propagation to prevent parent blocks from also being dragged
            e.stopPropagation();

            // Create unique operation id for this drag
            const opId = `drag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Store drag data - use DIRECT REFERENCE to element, not a clone
            this.draggedElement = elementDiv;
            this.draggedElement.dragData = {
                element: element,  // Direct reference to the actual element object
                itemId: element.id,
                opId: opId
            };

            elementDiv.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';

            // Set drag data
            try {
                e.dataTransfer.setData('text/plain', opId);
            } catch (err) {
                // Ignore if setData fails
            }
        };

        elementDiv.addEventListener('dragstart', startDrag);

        elementDiv.addEventListener('dragend', (e) => {
            e.stopPropagation();
            elementDiv.style.opacity = '1';

            // Clean up drag indicators from all elements
            document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
                el.classList.remove('drag-over-top', 'drag-over-bottom');
            });

            // Small delay before clearing draggedElement to allow drop to complete
            setTimeout(() => {
                this.draggedElement = null;
            }, 50);
        });

        // Add dragover and drop handlers to the element itself for reordering
        elementDiv.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!this.draggedElement || this.draggedElement === elementDiv) {
                return;
            }

            const dragData = this.draggedElement.dragData;
            if (!dragData) return;

            // Use direct element reference
            const draggedElement = dragData.element;

            // Prevent dropping into itself or its descendants
            if (this.isDescendantOrSelf(element, draggedElement)) {
                e.dataTransfer.dropEffect = 'none';
                return;
            }

            // Allow reordering only if both items are in arrays of the same type
            const sourceInfo = this.findParentAndArrayByObject(draggedElement);
            const targetInfo = this.findParentAndArrayByObject(element);

            if (!sourceInfo || !targetInfo) {
                e.dataTransfer.dropEffect = 'none';
                return;
            }

            const draggedIsAction = sourceInfo.arrayName === 'actions' || sourceInfo.arrayName === 'elseActions';
            const targetIsAction = targetInfo.arrayName === 'actions' || targetInfo.arrayName === 'elseActions';
            const draggedIsCondition = sourceInfo.arrayName === 'conditions';
            const targetIsCondition = targetInfo.arrayName === 'conditions';

            // Allow drop if types match (action to action, condition to condition)
            if ((draggedIsAction && targetIsAction) || (draggedIsCondition && targetIsCondition)) {
                e.dataTransfer.dropEffect = 'move';

                // Show drop indicator
                const rect = elementDiv.getBoundingClientRect();
                const mouseY = e.clientY;
                const elementMiddle = rect.top + rect.height / 2;

                // Remove previous indicators from all elements first
                document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
                    el.classList.remove('drag-over-top', 'drag-over-bottom');
                });

                if (mouseY < elementMiddle) {
                    elementDiv.classList.add('drag-over-top');
                } else {
                    elementDiv.classList.add('drag-over-bottom');
                }
            } else {
                e.dataTransfer.dropEffect = 'none';
            }
        });

        elementDiv.addEventListener('dragleave', (e) => {
            // Only remove if we're actually leaving the element
            if (!elementDiv.contains(e.relatedTarget)) {
                elementDiv.classList.remove('drag-over-top', 'drag-over-bottom');
            }
        });

        elementDiv.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Remove visual indicators
            document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
                el.classList.remove('drag-over-top', 'drag-over-bottom');
            });

            if (!this.draggedElement || this.draggedElement === elementDiv || !this.draggedElement.dragData) {
                return;
            }

            const dragData = this.draggedElement.dragData;
            const opId = dragData.opId;

            // Prevent duplicate processing
            if (!this._handledDragOps) this._handledDragOps = new Set();
            if (opId && this._handledDragOps.has(opId)) {
                return;
            }

            // Use the direct element reference
            const draggedElement = dragData.element;

            // Prevent dropping into itself or descendants
            if (this.isDescendantOrSelf(element, draggedElement)) {
                console.warn('Cannot drop a block into itself or its children');
                if (opId) this._handledDragOps.add(opId);
                return;
            }

            // Find current positions in the model using the actual objects
            const sourceInfo = this.findParentAndArrayByObject(draggedElement);
            const targetInfo = this.findParentAndArrayByObject(element);

            if (!sourceInfo) {
                console.warn('Could not find source item in model; aborting move');
                if (opId) this._handledDragOps.add(opId);
                return;
            }
            if (!targetInfo) {
                console.warn('Could not find target item in model; aborting move');
                if (opId) this._handledDragOps.add(opId);
                return;
            }

            // Ensure types match
            const draggedIsAction = sourceInfo.arrayName === 'actions' || sourceInfo.arrayName === 'elseActions';
            const targetIsAction = targetInfo.arrayName === 'actions' || targetInfo.arrayName === 'elseActions';
            const draggedIsCondition = sourceInfo.arrayName === 'conditions';
            const targetIsCondition = targetInfo.arrayName === 'conditions';

            if (!((draggedIsAction && targetIsAction) || (draggedIsCondition && targetIsCondition))) {
                if (opId) this._handledDragOps.add(opId);
                return;
            }

            // Get the arrays
            const sourceArr = sourceInfo.parent[sourceInfo.arrayName];
            const targetArr = targetInfo.parent[targetInfo.arrayName];

            // Find indices using object equality
            const srcIndex = sourceArr.indexOf(draggedElement);
            if (srcIndex === -1) {
                console.warn('Source item not found in array');
                if (opId) this._handledDragOps.add(opId);
                return;
            }

            const targetIndex = targetArr.indexOf(element);
            if (targetIndex === -1) {
                console.warn('Target item not found in array');
                if (opId) this._handledDragOps.add(opId);
                return;
            }

            // Remove from source array
            const [movedItem] = sourceArr.splice(srcIndex, 1);

            // Determine drop position
            const rect = elementDiv.getBoundingClientRect();
            const mouseY = e.clientY;
            const elementMiddle = rect.top + rect.height / 2;
            const dropAbove = mouseY < elementMiddle;

            // Calculate insert index
            let insertIndex;
            if (sourceArr === targetArr) {
                // Same array - need to adjust for removal
                if (srcIndex < targetIndex) {
                    insertIndex = dropAbove ? targetIndex - 1 : targetIndex;
                } else {
                    insertIndex = dropAbove ? targetIndex : targetIndex + 1;
                }
            } else {
                // Different arrays - no adjustment needed
                insertIndex = dropAbove ? targetIndex : targetIndex + 1;
            }

            // Insert at calculated position
            targetArr.splice(insertIndex, 0, movedItem);

            // Mark as handled and re-render
            if (opId) this._handledDragOps.add(opId);

            this.renderEventSheet();
            this.updateCode();

            // Clear handled operations after a delay
            setTimeout(() => {
                if (this._handledDragOps && opId) {
                    this._handledDragOps.delete(opId);
                }
            }, 1000);
        });

        elementDiv.addEventListener('mouseenter', () => {
            elementDiv.style.background = isCondition ? '#4a4a3a' : '#3a4a3a';
            dragHandle.style.color = '#999';
        });

        elementDiv.addEventListener('mouseleave', () => {
            elementDiv.style.background = isCondition ? '#3a3a2a' : '#2a3a2a';
            dragHandle.style.color = '#666';
        });

        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = 'flex: 1; width: 100%;';

        const labelContainer = document.createElement('div');
        labelContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

        // Main label and badge
        const mainLabelContainer = document.createElement('div');
        mainLabelContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1; flex-wrap: wrap;';

        // For nested blocks with conditions, show "if { ... }" with inline conditions
        if (def && def.supportsNestedConditions) {
            // Ensure the array exists
            if (!element.conditions) element.conditions = [];

            const ifLabel = document.createElement('span');
            ifLabel.style.cssText = `color: ${color}; font-size: inherit; font-weight: bold;`;
            ifLabel.textContent = 'if { ';
            mainLabelContainer.appendChild(ifLabel);

            // Build inline condition display
            if (element.conditions.length > 0) {
                element.conditions.forEach((cond, condIndex) => {
                    const condDef = this.getConditionDefinition(cond.type);
                    if (!condDef) return;

                    // Create condition pill
                    const conditionPill = document.createElement('span');
                    conditionPill.style.cssText = `
                        color: #ffa500;
                        font-size: 11px;
                        font-weight: normal;
                        padding: 2px 8px;
                        background: #3a3a2a;
                        border-radius: 3px;
                        border: 1px solid #ffa500;
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        cursor: pointer;
                    `;

                    // Build condition text
                    let condText = condDef.name;
                    if (cond.params && Object.keys(cond.params).length > 0) {
                        const paramStrs = Object.entries(cond.params)
                            .map(([key, value]) => {
                                if (typeof value === 'string' && value) return `"${value}"`;
                                if (typeof value === 'boolean') return value ? 'true' : 'false';
                                if (value !== undefined && value !== null && value !== '') return value;
                                return null;
                            })
                            .filter(v => v !== null);
                        if (paramStrs.length > 0) {
                            condText += ` (${paramStrs.join(', ')})`;
                        }
                    }

                    conditionPill.textContent = condText;

                    // Edit on click
                    conditionPill.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.editElement(cond, element, 'conditions', condIndex);
                    });

                    // Delete button
                    const deleteCondBtn = document.createElement('span');
                    deleteCondBtn.textContent = '✕';
                    deleteCondBtn.style.cssText = `
                        color: #ff6b6b;
                        font-weight: bold;
                        cursor: pointer;
                        padding: 0 2px;
                    `;
                    deleteCondBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        element.conditions.splice(condIndex, 1);
                        this.renderEventSheet();
                        this.updateCode();
                    });
                    conditionPill.appendChild(deleteCondBtn);

                    mainLabelContainer.appendChild(conditionPill);

                    // Add "&&" or "||" between conditions (clickable to toggle)
                    if (condIndex < element.conditions.length - 1) {
                        // Ensure logicOperator exists on element, default to 'AND'
                        if (!element.logicOperator) {
                            element.logicOperator = 'AND';
                        }

                        const operatorLabel = document.createElement('span');
                        operatorLabel.style.cssText = `
                            color: #4a7c59;
                            font-size: 11px;
                            font-weight: bold;
                            cursor: pointer;
                            padding: 2px 6px;
                            background: #2a2a2a;
                            border-radius: 3px;
                            border: 1px solid #4a7c59;
                            margin: 0 4px;
                            transition: all 0.2s;
                        `;
                        operatorLabel.textContent = element.logicOperator === 'AND' ? '&&' : '||';
                        operatorLabel.title = 'Click to toggle between AND (&&) and OR (||)';

                        operatorLabel.addEventListener('mouseenter', () => {
                            operatorLabel.style.background = '#3a5a49';
                            operatorLabel.style.transform = 'scale(1.1)';
                        });

                        operatorLabel.addEventListener('mouseleave', () => {
                            operatorLabel.style.background = '#2a2a2a';
                            operatorLabel.style.transform = 'scale(1)';
                        });

                        operatorLabel.addEventListener('click', (e) => {
                            e.stopPropagation();
                            // Toggle between AND and OR
                            element.logicOperator = element.logicOperator === 'AND' ? 'OR' : 'AND';
                            this.renderEventSheet();
                            this.updateCode();
                        });

                        mainLabelContainer.appendChild(operatorLabel);
                    }
                });
            } else {
                // No conditions - show placeholder
                const placeholder = document.createElement('span');
                placeholder.style.cssText = `
                    color: #888;
                    font-size: 10px;
                    font-style: italic;
                    padding: 2px 6px;
                    background: #2a2a2a;
                    border-radius: 3px;
                    cursor: pointer;
                `;
                placeholder.textContent = 'always true';
                placeholder.title = 'Click to add condition';
                placeholder.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showElementPicker(element, 'conditions');
                });
                mainLabelContainer.appendChild(placeholder);
            }

            // Add "+" button to add more conditions
            const addCondBtn = document.createElement('span');
            addCondBtn.style.cssText = `
                color: #4a7c59;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                padding: 2px 6px;
                background: #2a2a2a;
                border-radius: 3px;
                border: 1px dashed #4a7c59;
            `;
            addCondBtn.textContent = '+';
            addCondBtn.title = 'Add condition';
            addCondBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showElementPicker(element, 'conditions');
            });
            mainLabelContainer.appendChild(addCondBtn);

            const closingBrace = document.createElement('span');
            closingBrace.style.cssText = `color: ${color}; font-size: inherit; font-weight: bold;`;
            closingBrace.textContent = ' }';
            mainLabelContainer.appendChild(closingBrace);

        } else {
            // Regular action or simple condition - show normal label
            const label = document.createElement('div');
            label.textContent = this.formatElementLabel(element, arrayName);
            label.style.cssText = `color: ${color}; font-size: inherit; font-weight: ${isNestedBlock ? 'bold' : 'normal'};`;
            mainLabelContainer.appendChild(label);

            // Add badge for nested blocks
            if (isNestedBlock) {
                const badge = document.createElement('span');
                badge.textContent = '{ }';
                badge.style.cssText = `
                    background: ${color}44;
                    color: ${color};
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    font-weight: bold;
                `;
                mainLabelContainer.appendChild(badge);
            }

            // Add visual preview for drawing actions
            if (element.type && element.type.startsWith('draw') && !isCondition) {
                const previewCanvas = this.createDrawingPreview(element, 32, 32);
                if (previewCanvas) {
                    previewCanvas.style.cssText = `
                        cursor: pointer;
                        border: 1px solid #4a6a4a;
                        border-radius: 4px;
                        background: #1a1a1a;
                        margin-left: 8px;
                    `;
                    previewCanvas.title = 'Click to view larger preview';
                    previewCanvas.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.showDrawingPreviewModal(element);
                    });
                    mainLabelContainer.appendChild(previewCanvas);
                }
            }
        }

        labelContainer.appendChild(mainLabelContainer);

        const controls = document.createElement('div');
        controls.style.cssText = 'display: flex; gap: 4px;';

        const editBtn = this.createIconButton('✏️', 'Edit', () => {
            this.editElement(element, parentElement, arrayName, index);
        });

        const deleteBtn = this.createIconButton('✕', 'Delete', () => {
            parentElement[arrayName].splice(index, 1);
            this.renderEventSheet();
            this.updateCode();
        });

        controls.appendChild(editBtn);
        controls.appendChild(deleteBtn);
        labelContainer.appendChild(controls);

        contentWrapper.appendChild(labelContainer);

        // Add nested sections if this element supports them
        if (def && def.supportsNested) {
            // For condition blocks, only add the actions section (not conditions)
            if (def.supportsNestedActions) {
                // Ensure the array exists
                if (!element.actions) element.actions = [];

                const actionsContainer = document.createElement('div');
                actionsContainer.style.cssText = styles.nestedContainer + `
                    background: #1a1a1a;
                    border-radius: 4px;
                    padding: 8px;
                `;

                const nestedActions = this.createBlockSection(
                    'Actions',
                    element.actions,
                    element,
                    'actions',
                    '#4a7c59',
                    0
                );
                actionsContainer.appendChild(nestedActions);
                contentWrapper.appendChild(actionsContainer);
            }

            // Else actions section - visually separate and outside the main block
            if (def.supportsElse) {
                // Ensure the array exists
                if (!element.elseActions) element.elseActions = [];

                // Create a separate else container with distinct styling
                const elseContainer = document.createElement('div');
                elseContainer.style.cssText = `
                    margin-top: 8px;
                    padding: 8px;
                    background: #2a1a1a;
                    border-left: 3px solid #7c4a4a;
                    border-radius: 4px;
                    position: relative;
                `;

                // Add "else" label
                const elseLabel = document.createElement('div');
                elseLabel.textContent = 'else';
                elseLabel.style.cssText = `
                    font-weight: bold;
                    color: #7c4a4a;
                    font-size: 13px;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                `;
                elseContainer.appendChild(elseLabel);

                const elseActions = this.createBlockSection(
                    'Actions',
                    element.elseActions,
                    element,
                    'elseActions',
                    '#7c4a4a',
                    0
                );
                elseContainer.appendChild(elseActions);
                contentWrapper.appendChild(elseContainer);
            }
        }

        elementDiv.appendChild(contentWrapper);

        return elementDiv;
    }

    /**
     * Find parent and array by direct object reference (more reliable than ID)
     */
    findParentAndArrayByObject(itemObj) {
        if (!itemObj) return null;

        // Check top-level events first
        for (let i = 0; i < this.events.length; i++) {
            if (this.events[i] === itemObj) {
                return { parent: this, arrayName: 'events', index: i };
            }
        }

        // Recursive search within an array
        const nestedArrays = ['conditions', 'actions', 'elseActions'];

        const recurse = (parent, arrayName, arr) => {
            if (!Array.isArray(arr)) return null;
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                if (!item) continue;

                // Use object equality, not ID comparison
                if (item === itemObj) {
                    return { parent, arrayName, index: i };
                }

                // Check nested arrays of this item
                for (const na of nestedArrays) {
                    if (item[na] && Array.isArray(item[na])) {
                        const found = recurse(item, na, item[na]);
                        if (found) return found;
                    }
                }
            }
            return null;
        };

        // Try all events' condition/action arrays
        for (const ev of this.events) {
            // conditions
            const foundC = recurse(ev, 'conditions', ev.conditions || []);
            if (foundC) return foundC;
            // actions
            const foundA = recurse(ev, 'actions', ev.actions || []);
            if (foundA) return foundA;
            // elseActions
            const foundE = recurse(ev, 'elseActions', ev.elseActions || []);
            if (foundE) return foundE;
        }

        return null;
    }

    makeDropTarget(container, parentElement, targetArray) {
        container.addEventListener('dragover', (e) => {
            // IMPORTANT: Check if this specific container should handle the event
            // by verifying the event target is within this container's bounds
            if (!container.contains(e.target)) {
                return; // Not our container
            }

            // Check if we're hovering over a child action/condition element
            // (not the container's direct drop zone)
            let currentTarget = e.target;
            while (currentTarget && currentTarget !== container) {
                if (currentTarget.classList.contains('condition-element') ||
                    currentTarget.classList.contains('action-element')) {
                    // We're over a nested element, let that element handle it
                    return;
                }
                currentTarget = currentTarget.parentElement;
            }

            e.preventDefault();
            e.stopPropagation();

            // Prevent dropping an item into its own container or into a descendant of itself
            if (this.draggedElement && this.draggedElement.dragData) {
                const draggedElement = this.draggedElement.dragData.element;

                // Check if trying to drop into a descendant
                const wouldCreateLoop = this.isDescendantOrSelf(parentElement, draggedElement);

                // Debug logging
                console.log('Drop check:', {
                    parentType: parentElement.type,
                    draggedType: draggedElement.type,
                    targetArray: targetArray,
                    wouldCreateLoop: wouldCreateLoop
                });

                if (wouldCreateLoop) {
                    e.dataTransfer.dropEffect = 'none';
                    container.style.borderColor = '#ff0000';
                    container.style.background = '#3a2a2a';
                    return;
                }

                e.dataTransfer.dropEffect = 'move';
            }

            container.style.borderColor = '#4a7c59';
            container.style.background = '#2a3a2a';
            container.style.transform = 'scale(1.01)';
        });

        container.addEventListener('dragleave', (e) => {
            // Don't reset if we're entering a child element
            if (container.contains(e.relatedTarget)) return;

            container.style.borderColor = '#555';
            container.style.background = '#252525';
            container.style.transform = 'scale(1)';
        });

        container.addEventListener('drop', (e) => {
            // Check if this container should handle the drop
            if (!container.contains(e.target)) {
                return;
            }

            // Check if we're dropping on a child element
            let currentTarget = e.target;
            while (currentTarget && currentTarget !== container) {
                if (currentTarget.classList.contains('condition-element') ||
                    currentTarget.classList.contains('action-element')) {
                    // Dropping on a nested element, let that handle it
                    return;
                }
                currentTarget = currentTarget.parentElement;
            }

            e.preventDefault();
            e.stopPropagation();

            container.style.borderColor = '#555';
            container.style.background = '#252525';
            container.style.transform = 'scale(1)';

            if (!this.draggedElement || !this.draggedElement.dragData) return;

            const dragData = this.draggedElement.dragData;
            const opId = dragData.opId;

            if (!this._handledDragOps) this._handledDragOps = new Set();
            if (opId && this._handledDragOps.has(opId)) {
                return;
            }

            // Use direct element reference
            const draggedElement = dragData.element;

            // Prevent dropping into itself or descendants
            if (this.isDescendantOrSelf(parentElement, draggedElement)) {
                console.warn('Cannot drop a block into itself or its children');
                if (opId) this._handledDragOps.add(opId);
                return;
            }

            // Find and remove from source using object reference
            const sourceInfo = this.findParentAndArrayByObject(draggedElement);
            if (sourceInfo) {
                const srcArr = sourceInfo.parent[sourceInfo.arrayName];
                const idx = srcArr.indexOf(draggedElement);
                if (idx !== -1) {
                    const [movedItem] = srcArr.splice(idx, 1);

                    // Add to target array
                    if (!parentElement[targetArray]) {
                        parentElement[targetArray] = [];
                    }
                    parentElement[targetArray].push(movedItem);
                }
            } else {
                console.warn('Source not found when dropping to container.');
            }

            if (opId) this._handledDragOps.add(opId);

            this.renderEventSheet();
            this.updateCode();

            // Clear handled operations after a delay
            setTimeout(() => {
                if (this._handledDragOps && opId) {
                    this._handledDragOps.delete(opId);
                }
            }, 1000);
        });
    }

    // Helper method to check if targetParent is the draggedItem itself or a descendant of it
    isDescendantOrSelf(targetParent, draggedItem) {
        if (!targetParent || !draggedItem) return false;

        // Check if target parent IS the dragged item itself using object equality
        if (targetParent === draggedItem) {
            return true;
        }

        // Only check ID equality if both items actually have IDs
        if (targetParent.id && draggedItem.id && targetParent.id === draggedItem.id) {
            return true;
        }

        // Recursively check if targetParent is nested inside the dragged item
        // This checks if draggedItem CONTAINS targetParent (not the other way around)
        return this.containsElement(draggedItem, targetParent);
    }

    containsElement(element, target) {
        if (!element || !target) return false;

        // Check conditions array
        if (element.conditions && Array.isArray(element.conditions)) {
            for (const cond of element.conditions) {
                // Use object equality first, then ID as fallback (only if both have IDs)
                if (cond === target) {
                    return true;
                }
                if (cond.id && target.id && cond.id === target.id) {
                    return true;
                }
                // Recursively check if this condition contains the target
                if (this.containsElement(cond, target)) {
                    return true;
                }
            }
        }

        // Check actions array
        if (element.actions && Array.isArray(element.actions)) {
            for (const action of element.actions) {
                // Use object equality first, then ID as fallback (only if both have IDs)
                if (action === target) {
                    return true;
                }
                if (action.id && target.id && action.id === target.id) {
                    return true;
                }
                // Recursively check if this action contains the target
                if (this.containsElement(action, target)) {
                    return true;
                }
            }
        }

        // Check elseActions array
        if (element.elseActions && Array.isArray(element.elseActions)) {
            for (const elseAction of element.elseActions) {
                // Use object equality first, then ID as fallback (only if both have IDs)
                if (elseAction === target) {
                    return true;
                }
                if (elseAction.id && target.id && elseAction.id === target.id) {
                    return true;
                }
                // Recursively check if this else action contains the target
                if (this.containsElement(elseAction, target)) {
                    return true;
                }
            }
        }

        return false;
    }

    createConditionElement(condition, event, index) {
        return this.createBlockElement(condition, event, 'conditions', index, 0, '#ffa500');
    }

    createActionElement(action, event, index) {
        return this.createBlockElement(action, event, 'actions', index, 0, '#4a7c59');
    }

    formatConditionLabel(condition) {
        return this.formatElementLabel(condition, 'conditions');
    }

    formatActionLabel(action) {
        return this.formatElementLabel(action, 'actions');
    }

    formatElementLabel(element, arrayName) {
        const isConditionContext = arrayName === 'conditions' || arrayName.includes('conditions');
        const definition = isConditionContext ?
            this.getConditionDefinition(element.type) :
            this.getActionDefinition(element.type);

        // If not found in conditions, try actions (for nested if blocks in actions)
        const def = definition || this.getConditionDefinition(element.type) || this.getActionDefinition(element.type);

        if (!def) return element.type;

        let label = def.name;
        if (element.params && Object.keys(element.params).length > 0) {
            const paramStrs = Object.entries(element.params).map(([key, value]) => {
                if (typeof value === 'string' && value) return `"${value}"`;
                if (typeof value === 'boolean') return value ? 'true' : 'false';
                if (value !== undefined && value !== null && value !== '') return value;
                return null;
            }).filter(v => v !== null);
            if (paramStrs.length > 0) {
                label += ` (${paramStrs.join(', ')})`;
            }
        }
        return label;
    }

    showConditionPicker(event, targetArray) {
        this.showElementPicker(event, targetArray);
    }

    showElementPicker(parentElement, targetArray) {
        // Determine what to show based on context
        let definitions = [];
        let title = '';

        if (targetArray === 'conditions') {
            // In conditions section, show all conditions
            definitions = this.getConditionDefinitions();
            title = 'Select Condition';
        } else if (targetArray === 'actions' || targetArray === 'elseActions') {
            // In actions section, show condition blocks AND actions
            const conditionBlocks = this.getConditionDefinitions().filter(d => d.supportsNested);
            const actions = this.getActionDefinitions();
            definitions = [...conditionBlocks, ...actions];
            title = 'Select Action or Condition Block';
        }

        // Group definitions by category
        const groups = this.groupDefinitionsByCategory(definitions);

        // Navigation state
        let currentView = 'groups'; // 'groups', 'actions'
        let selectedGroup = null;

        const renderModal = () => {
            this.propertyModal.innerHTML = '';
            this.propertyModal.style.display = 'block';

            // Header with back button
            const headerContainer = document.createElement('div');
            headerContainer.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
            `;

            // Back button (conditionally shown)
            if (currentView !== 'groups') {
                const backBtn = document.createElement('button');
                backBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
                backBtn.style.cssText = `
                    padding: 8px 12px;
                    background: #444;
                    border: none;
                    color: #fff;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background 0.2s;
                `;
                backBtn.addEventListener('mouseenter', () => backBtn.style.background = '#555');
                backBtn.addEventListener('mouseleave', () => backBtn.style.background = '#444');
                backBtn.addEventListener('click', () => {
                    if (currentView === 'actions') {
                        currentView = 'groups';
                        selectedGroup = null;
                    }
                    renderModal();
                });
                headerContainer.appendChild(backBtn);
            }

            const titleEl = document.createElement('h3');
            titleEl.textContent = currentView === 'groups' ? title : selectedGroup.name;
            titleEl.style.cssText = 'margin: 0; color: #fff; flex: 1;';
            headerContainer.appendChild(titleEl);

            this.propertyModal.appendChild(headerContainer);

            const contentContainer = document.createElement('div');
            contentContainer.style.cssText = `
                max-height: 500px;
                overflow-y: auto;
                margin-bottom: 15px;
            `;

            if (currentView === 'groups') {
                // Show groups as icon boxes
                const groupsGrid = document.createElement('div');
                groupsGrid.style.cssText = `
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 15px;
                    padding: 10px;
                `;

                Object.values(groups).forEach(group => {
                    const groupBox = document.createElement('div');
                    groupBox.style.cssText = `
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 20px 10px;
                        background: #2a2a2a;
                        border: 2px solid #444;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-align: center;
                        min-height: 100px;
                    `;

                    // Icon container
                    const iconBox = document.createElement('div');
                    iconBox.innerHTML = `<i class="${group.icon}"></i>`;
                    iconBox.style.cssText = `
                        font-size: 32px;
                        color: ${group.color};
                        margin-bottom: 10px;
                    `;

                    // Group name
                    const groupName = document.createElement('div');
                    groupName.textContent = group.name;
                    groupName.style.cssText = `
                        color: #fff;
                        font-size: 13px;
                        font-weight: bold;
                    `;

                    // Count badge
                    const countBadge = document.createElement('div');
                    countBadge.textContent = `${group.items.length} items`;
                    countBadge.style.cssText = `
                        color: #888;
                        font-size: 10px;
                        margin-top: 4px;
                    `;

                    groupBox.appendChild(iconBox);
                    groupBox.appendChild(groupName);
                    groupBox.appendChild(countBadge);

                    groupBox.addEventListener('mouseenter', () => {
                        groupBox.style.background = '#333';
                        groupBox.style.borderColor = group.color;
                        groupBox.style.transform = 'translateY(-2px)';
                    });

                    groupBox.addEventListener('mouseleave', () => {
                        groupBox.style.background = '#2a2a2a';
                        groupBox.style.borderColor = '#444';
                        groupBox.style.transform = 'translateY(0)';
                    });

                    groupBox.addEventListener('click', () => {
                        selectedGroup = group;
                        currentView = 'actions';
                        renderModal();
                    });

                    groupsGrid.appendChild(groupBox);
                });

                contentContainer.appendChild(groupsGrid);
            } else if (currentView === 'actions') {
                // Show actions in selected group
                const actionsList = document.createElement('div');
                actionsList.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

                selectedGroup.items.forEach(def => {
                    const item = document.createElement('div');
                    item.style.cssText = `
                        padding: 12px;
                        background: #2a2a2a;
                        border: 1px solid #444;
                        border-left: 3px solid ${selectedGroup.color};
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.2s;
                    `;

                    item.addEventListener('mouseenter', () => {
                        item.style.background = '#333';
                        item.style.borderColor = selectedGroup.color;
                    });

                    item.addEventListener('mouseleave', () => {
                        item.style.background = '#2a2a2a';
                        item.style.borderColor = '#444';
                    });

                    const itemHeader = document.createElement('div');
                    itemHeader.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 4px;';

                    const itemIcon = document.createElement('i');
                    itemIcon.className = selectedGroup.icon;
                    itemIcon.style.cssText = `color: ${selectedGroup.color}; font-size: 14px;`;

                    const itemTitle = document.createElement('span');
                    itemTitle.textContent = def.name;
                    itemTitle.style.cssText = 'color: #fff; font-weight: bold; font-size: 14px;';

                    itemHeader.appendChild(itemIcon);
                    itemHeader.appendChild(itemTitle);

                    const itemDesc = document.createElement('div');
                    itemDesc.textContent = def.description || '';
                    itemDesc.style.cssText = 'color: #aaa; font-size: 11px; margin-left: 22px;';

                    item.appendChild(itemHeader);
                    item.appendChild(itemDesc);

                    item.addEventListener('click', () => {
                        const newElement = {
                            id: this.generateId(),
                            type: def.type,
                            params: this.getDefaultParams(def.inputs)
                        };

                        // Add nested arrays if this element supports them
                        if (def.supportsNested) {
                            if (def.supportsNestedConditions) newElement.conditions = [];
                            if (def.supportsNestedActions) newElement.actions = [];
                            if (def.supportsElse) newElement.elseActions = [];
                        }

                        this.propertyModal.style.display = 'none';
                        this.editElement(newElement, parentElement, targetArray, -1);
                    });

                    actionsList.appendChild(item);
                });

                contentContainer.appendChild(actionsList);
            }

            this.propertyModal.appendChild(contentContainer);

            // Cancel button
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Cancel';
            closeBtn.style.cssText = `
                padding: 8px 16px;
                background: #555;
                border: none;
                color: #fff;
                border-radius: 4px;
                cursor: pointer;
                width: 100%;
            `;
            closeBtn.addEventListener('click', () => {
                this.propertyModal.style.display = 'none';
            });
            this.propertyModal.appendChild(closeBtn);
        };

        renderModal();
    }

    groupDefinitionsByCategory(definitions) {
        const groups = {};
        const categoryConfig = {
            'Transform': { icon: 'fas fa-arrows-alt', color: '#6a9fb5' },
            'GameObject': { icon: 'fas fa-cube', color: '#b56a9f' },
            'Variables': { icon: 'fas fa-database', color: '#b5926a' },
            'Modules': { icon: 'fas fa-puzzle-piece', color: '#9fb56a' },
            'Drawing': { icon: 'fas fa-paint-brush', color: '#b56a6a' },
            'Control': { icon: 'fas fa-code-branch', color: '#6ab5b5' },
            'Input': { icon: 'fas fa-keyboard', color: '#b5b56a' },
            'Audio': { icon: 'fas fa-volume-up', color: '#b56ab5' },
            'Physics': { icon: 'fas fa-atom', color: '#6ab56a' },
            'Animation': { icon: 'fas fa-running', color: '#b5836a' },
            'Camera': { icon: 'fas fa-camera', color: '#6a83b5' },
            'Collision': { icon: 'fas fa-shield-alt', color: '#b5996a' },
            'Time': { icon: 'fas fa-clock', color: '#6aa3b5' },
            'Debug': { icon: 'fas fa-bug', color: '#b56a83' },
            'Network': { icon: 'fas fa-network-wired', color: '#83b56a' },
            'Storage': { icon: 'fas fa-save', color: '#b56ab5' },
            'Conditions': { icon: 'fas fa-question-circle', color: '#ffa500' },
            'Uncategorized': { icon: 'fas fa-ellipsis-h', color: '#888' }
        };

        definitions.forEach(def => {
            const category = def.category || 'Uncategorized';

            if (!groups[category]) {
                const config = categoryConfig[category] || categoryConfig['Uncategorized'];
                groups[category] = {
                    name: category,
                    icon: config.icon,
                    color: config.color,
                    items: []
                };
            }

            groups[category].items.push(def);
        });

        return groups;
    }

    getDefaultParams(inputs) {
        const params = {};
        if (inputs) {
            inputs.forEach(input => {
                if (input.type === 'boolean') {
                    params[input.name] = false;
                } else if (input.type === 'number') {
                    params[input.name] = input.default || 0;
                } else {
                    params[input.name] = input.default || '';
                }
            });
        }
        return params;
    }

    editElement(element, parentElement, arrayName, index) {
        // Save state before editing (will be saved again when changes are applied)
        // Only save if actually modifying existing element
        if (index >= 0) {
            this.saveState();
        }
        // Try to find definition in both conditions and actions
        let definition = null;

        if (arrayName === 'conditions' || (arrayName && arrayName.includes('conditions'))) {
            definition = this.getConditionDefinition(element.type);
        }

        if (!definition) {
            definition = this.getActionDefinition(element.type);
        }

        if (!definition) {
            definition = this.getConditionDefinition(element.type);
        }

        if (!definition) {
            console.error('Definition not found for type:', element.type);
            return;
        }

        this.propertyModal.innerHTML = '';
        this.propertyModal.style.display = 'block';

        // Create a container for modal content with flexbox layout
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            display: flex;
            gap: 20px;
            max-width: 100%;
        `;

        // Left side: form inputs
        const leftColumn = document.createElement('div');
        leftColumn.style.cssText = 'flex: 1; min-width: 300px; max-width: 400px;';

        const title = document.createElement('h3');
        title.textContent = `Edit ${definition.name}`;
        title.style.cssText = 'margin: 0 0 15px 0; color: #fff;';
        leftColumn.appendChild(title);

        const form = document.createElement('div');
        form.style.cssText = 'margin-bottom: 15px;';

        const inputs = {};

        // Check if this is a drawing action
        const isDrawingAction = element.type && element.type.startsWith('draw');
        let previewCanvas = null;
        let previewCtx = null;

        if (definition.inputs && definition.inputs.length > 0) {
            definition.inputs.forEach((input, inputIndex) => {
                // Dynamic options based on module selection
                let dynamicInput = { ...input };

                // For module-related actions/conditions, dynamically populate options
                if (input.name === 'moduleName') {
                    const availableModules = this.getAvailableModules();
                    dynamicInput.options = availableModules.map(m => m.className);

                    if (availableModules.length === 0) {
                        dynamicInput.options = ['(No modules available)'];
                    }
                }

                // For property/method/variable fields, update based on selected module
                if ((input.name === 'propertyName' || input.name === 'methodName' || input.name === 'variableName') && element.params.moduleName) {
                    const availableModules = this.getAvailableModules();
                    const selectedModule = availableModules.find(m => m.className === element.params.moduleName);

                    if (selectedModule) {
                        if (input.name === 'propertyName' && selectedModule.properties.length > 0) {
                            dynamicInput.options = selectedModule.properties.map(p => p.name);
                            dynamicInput.type = 'string'; // Will use dropdown
                        }
                        if (input.name === 'methodName' && selectedModule.methods.length > 0) {
                            dynamicInput.options = selectedModule.methods.map(m => m.name);
                            dynamicInput.type = 'string'; // Will use dropdown
                        }
                        if (input.name === 'variableName' && selectedModule.variables && selectedModule.variables.length > 0) {
                            dynamicInput.options = selectedModule.variables.map(v => v.name);
                            dynamicInput.type = 'string'; // Will use dropdown
                        }
                    }
                }

                const field = this.createInputField(dynamicInput, element.params[input.name], element, inputs);
                form.appendChild(field.container);
                inputs[input.name] = field.input;

                // Add live preview update for drawing actions
                if (isDrawingAction) {
                    field.input.addEventListener('input', () => {
                        if (previewCanvas && previewCtx) {
                            this.updateDrawingPreview(element, inputs, previewCtx, previewCanvas.width, previewCanvas.height);
                        }
                    });
                }

                // Add change listener for moduleName to refresh property/method/variable dropdowns
                if (input.name === 'moduleName') {
                    // Store a reference to the change handler function
                    const moduleChangeHandler = (e) => {
                        element.params.moduleName = e.target.value;

                        // Clear and rebuild form
                        while (form.firstChild) {
                            form.removeChild(form.firstChild);
                        }

                        const newInputs = {};
                        definition.inputs.forEach((inp, idx) => {
                            let dynInput = { ...inp };

                            if (inp.name === 'moduleName') {
                                const availableModules = this.getAvailableModules();
                                dynInput.options = availableModules.map(m => m.className);
                            }

                            // Update property/method/variable options based on new module selection
                            if ((inp.name === 'propertyName' || inp.name === 'methodName' || inp.name === 'variableName') && element.params.moduleName) {
                                const availableModules = this.getAvailableModules();
                                const selectedModule = availableModules.find(m => m.className === element.params.moduleName);

                                if (selectedModule) {
                                    if (inp.name === 'propertyName' && selectedModule.properties.length > 0) {
                                        dynInput.options = selectedModule.properties.map(p => p.name);
                                        dynInput.type = 'string';
                                    }
                                    if (inp.name === 'methodName' && selectedModule.methods.length > 0) {
                                        dynInput.options = selectedModule.methods.map(m => m.name);
                                        dynInput.type = 'string';
                                    }
                                    if (inp.name === 'variableName' && selectedModule.variables && selectedModule.variables.length > 0) {
                                        dynInput.options = selectedModule.variables.map(v => v.name);
                                        dynInput.type = 'string';
                                    }
                                }
                            }

                            const fld = this.createInputField(dynInput, element.params[inp.name], element, newInputs);
                            form.appendChild(fld.container);
                            newInputs[inp.name] = fld.input;

                            // Add live preview update for drawing actions
                            if (isDrawingAction) {
                                fld.input.addEventListener('input', () => {
                                    if (previewCanvas && previewCtx) {
                                        this.updateDrawingPreview(element, newInputs, previewCtx, previewCanvas.width, previewCanvas.height);
                                    }
                                });
                            }

                            // Re-attach the change listener for moduleName
                            if (inp.name === 'moduleName') {
                                fld.input.addEventListener('change', moduleChangeHandler);
                            }
                        });

                        Object.assign(inputs, newInputs);
                    };

                    field.input.addEventListener('change', moduleChangeHandler);
                }
            });
        } else {
            const noParams = document.createElement('div');
            noParams.textContent = 'No parameters to configure';
            noParams.style.cssText = 'color: #888; font-style: italic; margin-bottom: 10px;';
            form.appendChild(noParams);
        }

        leftColumn.appendChild(form);

        // Right side: preview canvas for drawing actions
        if (isDrawingAction) {
            const rightColumn = document.createElement('div');
            rightColumn.style.cssText = `
                flex: 0 0 280px;
                display: flex;
                flex-direction: column;
            `;

            const previewTitle = document.createElement('h3');
            previewTitle.textContent = 'Preview';
            previewTitle.style.cssText = 'margin: 0 0 15px 0; color: #fff;';
            rightColumn.appendChild(previewTitle);

            const previewContainer = document.createElement('div');
            previewContainer.style.cssText = `
                background: #1a1a1a;
                border: 2px solid #4a7c59;
                border-radius: 8px;
                padding: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 280px;
            `;

            previewCanvas = document.createElement('canvas');
            previewCanvas.width = 250;
            previewCanvas.height = 250;
            previewCanvas.style.cssText = `
                background: #0a0a0a;
                border-radius: 4px;
                max-width: 100%;
                height: auto;
            `;
            previewCtx = previewCanvas.getContext('2d');

            previewContainer.appendChild(previewCanvas);
            rightColumn.appendChild(previewContainer);

            modalContent.appendChild(leftColumn);
            modalContent.appendChild(rightColumn);

            // Initial preview render
            this.updateDrawingPreview(element, inputs, previewCtx, previewCanvas.width, previewCanvas.height);
        } else {
            modalContent.appendChild(leftColumn);
        }

        this.propertyModal.appendChild(modalContent);

        const buttons = document.createElement('div');
        buttons.style.cssText = 'display: flex; gap: 10px; margin-top: 15px;';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.style.cssText = `
            flex: 1;
            padding: 8px 16px;
            background: #4a7c59;
            border: none;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
        `;
        saveBtn.addEventListener('click', () => {
            // Update params
            Object.keys(inputs).forEach(key => {
                const input = inputs[key];
                if (input.type === 'checkbox') {
                    element.params[key] = input.checked;
                } else if (input.type === 'number') {
                    element.params[key] = parseFloat(input.value) || 0;
                } else {
                    element.params[key] = input.value;
                }
            });

            // Add to parent if new (index === -1)
            if (index === -1) {
                if (!parentElement[arrayName]) {
                    parentElement[arrayName] = [];
                }
                parentElement[arrayName].push(element);
            }

            this.propertyModal.style.display = 'none';
            this.renderEventSheet();
            this.updateCode();
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            flex: 1;
            padding: 8px 16px;
            background: #555;
            border: none;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
        `;
        cancelBtn.addEventListener('click', () => {
            this.propertyModal.style.display = 'none';
        });

        buttons.appendChild(saveBtn);
        buttons.appendChild(cancelBtn);
        this.propertyModal.appendChild(buttons);
    }

    // New helper method to update the preview with current input values
    updateDrawingPreview(element, inputs, ctx, canvasWidth, canvasHeight) {
        // Clear canvas
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Create a temporary params object from current input values
        const tempParams = {};
        Object.keys(inputs).forEach(key => {
            const input = inputs[key];
            if (input.type === 'checkbox') {
                tempParams[key] = input.checked;
            } else if (input.type === 'number') {
                tempParams[key] = parseFloat(input.value) || 0;
            } else {
                tempParams[key] = input.value;
            }
        });

        // Create a temporary element with updated params
        const tempElement = {
            type: element.type,
            params: tempParams
        };

        // Set up centered coordinate system (just like createDrawingPreview does)
        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);

        try {
            // Render the drawing action
            this.renderDrawingAction(tempElement, ctx, canvasWidth, canvasHeight, 0.8);
        } catch (e) {
            console.error('Error rendering drawing preview:', e);
        }

        ctx.restore();
    }

    createInputField(inputDef, value, element, allInputs) {
        const container = document.createElement('div');
        container.style.cssText = 'margin-bottom: 12px;';

        const label = document.createElement('label');
        label.textContent = inputDef.label || inputDef.name;
        label.style.cssText = 'display: block; color: #fff; margin-bottom: 6px; font-size: 13px;';
        container.appendChild(label);

        let input;

        // Special handling for 'code' parameter - use CodeMirror editor
        if (inputDef.name === 'code' && (inputDef.label === 'Code' || element.type === 'customAction' || element.type === 'customCondition')) {
            // Create a textarea that will be replaced by CodeMirror
            input = document.createElement('textarea');
            input.value = value || (inputDef.default || '');
            input.style.cssText = `
            width: 100%;
            height: 200px;
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 13px;
        `;

            container.appendChild(input);

            // Initialize CodeMirror after a short delay to ensure DOM is ready
            setTimeout(async () => {
                // Load CodeMirror if not already loaded
                if (!window.CodeMirror) {
                    await this.loadCodeMirrorDependencies();
                }

                // Create CodeMirror instance
                if (window.CodeMirror && input.parentElement) {
                    const editor = CodeMirror.fromTextArea(input, {
                        mode: "javascript",
                        theme: "dracula",
                        lineNumbers: true,
                        autoCloseBrackets: true,
                        matchBrackets: true,
                        indentUnit: 4,
                        tabSize: 4,
                        indentWithTabs: false,
                        lineWrapping: true,
                        extraKeys: {
                            "Ctrl-Space": "autocomplete"
                        }
                    });

                    // Set initial value
                    editor.setValue(value || (inputDef.default || ''));

                    // Sync changes back to the textarea
                    editor.on("change", () => {
                        input.value = editor.getValue();
                    });

                    // Refresh to ensure proper display
                    setTimeout(() => {
                        editor.refresh();
                    }, 50);

                    // Store reference for cleanup
                    input._codeMirrorInstance = editor;
                }
            }, 50);

            // Return early since we already appended the input
            if (inputDef.description) {
                const desc = document.createElement('div');
                desc.textContent = inputDef.description;
                desc.style.cssText = 'color: #888; font-size: 11px; margin-top: 4px;';
                container.appendChild(desc);
            }

            return { container, input };
        }// Special handling for key dropdown with categories
        else if (inputDef.useKeyDropdown && inputDef.options && inputDef.options.length > 0) {
            input = document.createElement('select');
            input.style.cssText = `
                width: 100%;
                padding: 8px;
                background: #333;
                border: 1px solid #555;
                color: #fff;
                border-radius: 4px;
            `;

            inputDef.options.forEach(opt => {
                // Check if this is a category header
                if (opt.startsWith('---')) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = opt.replace(/---/g, '').trim();
                    input.appendChild(optgroup);
                } else {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    option.selected = value === opt;

                    // Add to last optgroup if it exists, otherwise add to select
                    const lastChild = input.lastElementChild;
                    if (lastChild && lastChild.tagName === 'OPTGROUP') {
                        lastChild.appendChild(option);
                    } else {
                        input.appendChild(option);
                    }
                }
            });

            // Add description if present
            if (inputDef.description) {
                const desc = document.createElement('div');
                desc.textContent = inputDef.description;
                desc.style.cssText = 'color: #888; font-size: 11px; margin-top: 4px;';
                container.appendChild(desc);
            }

            // Append the select input
            container.appendChild(input);

            // Return early since we handled everything
            return { container, input };
        }
        else if (inputDef.type === 'boolean') {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = value || false;
            input.style.cssText = 'width: 20px; height: 20px; cursor: pointer;';
        } else if (inputDef.type === 'number') {
            input = document.createElement('input');
            input.type = 'number';
            input.value = value !== undefined ? value : (inputDef.default || 0);
            input.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 4px;
        `;
            if (inputDef.min !== undefined) input.min = inputDef.min;
            if (inputDef.max !== undefined) input.max = inputDef.max;
            if (inputDef.step !== undefined) input.step = inputDef.step;
        } else if (inputDef.options && inputDef.options.length > 0) {
            input = document.createElement('select');
            input.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 4px;
        `;
            inputDef.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                option.selected = value === opt;
                input.appendChild(option);
            });
        } else if (inputDef.name === 'color' || (inputDef.label && inputDef.label.toLowerCase().includes('color'))) {
            // Special handling for color inputs - create both color picker and text input
            const colorWrapper = document.createElement('div');
            colorWrapper.style.cssText = `
            display: flex;
            gap: 8px;
            align-items: stretch;
        `;

            // Create color picker
            const colorPicker = document.createElement('input');
            colorPicker.type = 'color';
            colorPicker.value = value || inputDef.default || '#ffffff';
            colorPicker.style.cssText = `
            width: 60px;
            height: 42px;
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
            cursor: pointer;
            padding: 2px;
        `;

            // Create text input
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.value = value || inputDef.default || '#ffffff';
            textInput.style.cssText = `
            flex: 1;
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 4px;
        `;

            // Sync color picker and text input
            colorPicker.addEventListener('input', (e) => {
                textInput.value = e.target.value;
                // Trigger change event so the element updates
                textInput.dispatchEvent(new Event('input'));
            });

            textInput.addEventListener('input', (e) => {
                // Validate hex color and update color picker if valid
                const colorValue = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
                    colorPicker.value = colorValue;
                }
            });

            colorWrapper.appendChild(colorPicker);
            colorWrapper.appendChild(textInput);
            container.appendChild(colorWrapper);

            // Store reference to text input as the main input
            input = textInput;
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.value = value || (inputDef.default || '');
            input.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 4px;
        `;
        }

        // Show module info if this is a module-dependent field
        if (inputDef.description) {
            const desc = document.createElement('div');
            desc.textContent = inputDef.description;
            desc.style.cssText = 'color: #888; font-size: 11px; margin-top: 4px;';
            container.appendChild(desc);
        }

        // Only append input if it wasn't already added
        if (!inputDef.useKeyDropdown && inputDef.name !== 'color' && (!inputDef.label || !inputDef.label.toLowerCase().includes('color')) &&
            inputDef.name !== 'code') {
            container.appendChild(input);
        }

        // Show module info if this is a module-dependent field
        if ((inputDef.name === 'propertyName' || inputDef.name === 'methodName' || inputDef.name === 'variableName') && element && element.params.moduleName) {
            // Create loading spinner placeholder
            const loadingBox = document.createElement('div');
            loadingBox.style.cssText = `
                margin-top: 8px;
                padding: 8px;
                background: #1a1a1a;
                border-left: 3px solid #4a7c59;
                border-radius: 4px;
                font-size: 11px;
                color: #aaa;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            // Create spinner
            const spinner = document.createElement('div');
            spinner.style.cssText = `
                width: 16px;
                height: 16px;
                border: 2px solid #4a7c59;
                border-top: 2px solid transparent;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            `;
            
            // Add CSS animation if not already added
            if (!document.getElementById('spinner-style')) {
                const style = document.createElement('style');
                style.id = 'spinner-style';
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            const loadingText = document.createElement('span');
            loadingText.textContent = 'Loading module information...';
            
            loadingBox.appendChild(spinner);
            loadingBox.appendChild(loadingText);
            container.appendChild(loadingBox);
            
            // Load module info asynchronously
            setTimeout(() => {
                try {
                    const availableModules = this.getAvailableModules();
                    const selectedModule = availableModules.find(m => m.className === element.params.moduleName);

                    if (selectedModule) {
                        const infoBox = document.createElement('div');
                        infoBox.style.cssText = `
                            margin-top: 8px;
                            padding: 8px;
                            background: #1a1a1a;
                            border-left: 3px solid #4a7c59;
                            border-radius: 4px;
                            font-size: 11px;
                            color: #aaa;
                            max-height: 200px;
                            overflow-y: auto;
                        `;

                        if (inputDef.name === 'propertyName') {
                            infoBox.innerHTML = `<strong style="color: #4a7c59;">Available Properties:</strong><br>`;
                            if (selectedModule.properties.length > 0) {
                                selectedModule.properties.forEach(prop => {
                                    infoBox.innerHTML += `• <span style="color: #ffa500;">${prop.name}</span> <span style="color: #666;">(${prop.type})</span>`;
                                    if (prop.description) {
                                        infoBox.innerHTML += ` - ${prop.description}`;
                                    }
                                    infoBox.innerHTML += `<br>`;
                                });
                            } else {
                                infoBox.innerHTML += `<span style="color: #666;">No exposed properties found</span>`;
                            }
                        } else if (inputDef.name === 'methodName') {
                            infoBox.innerHTML = `<strong style="color: #4a7c59;">Available Methods:</strong><br>`;
                            if (selectedModule.methods.length > 0) {
                                selectedModule.methods.forEach(method => {
                                    const params = method.params.join(', ') || '';
                                    infoBox.innerHTML += `• <span style="color: #6a9fb5;">${method.name}</span><span style="color: #666;">(${params})</span>`;
                                    if (method.description) {
                                        infoBox.innerHTML += `<br>&nbsp;&nbsp;<span style="color: #888; font-style: italic;">${method.description}</span>`;
                                    }
                                    infoBox.innerHTML += `<br>`;
                                });
                            } else {
                                infoBox.innerHTML += `<span style="color: #666;">No public methods found</span>`;
                            }
                        } else if (inputDef.name === 'variableName') {
                            infoBox.innerHTML = `<strong style="color: #4a7c59;">Available Variables:</strong><br>`;
                            if (selectedModule.variables && selectedModule.variables.length > 0) {
                                selectedModule.variables.forEach(variable => {
                                    infoBox.innerHTML += `• <span style="color: #c792ea;">${variable.name}</span> <span style="color: #666;">(${variable.type})</span>`;
                                    if (variable.description) {
                                        infoBox.innerHTML += ` - ${variable.description}`;
                                    }
                                    if (variable.defaultValue !== undefined && variable.defaultValue !== null) {
                                        const displayValue = typeof variable.defaultValue === 'string' ? `"${variable.defaultValue}"` : variable.defaultValue;
                                        infoBox.innerHTML += ` <span style="color: #555;">[default: ${displayValue}]</span>`;
                                    }
                                    infoBox.innerHTML += `<br>`;
                                });
                            } else {
                                infoBox.innerHTML += `<span style="color: #666;">No public variables found</span>`;
                            }
                        }

                        // Replace loading box with info box
                        container.replaceChild(infoBox, loadingBox);
                    } else {
                        // Module not found, show error
                        loadingBox.innerHTML = `<span style="color: #ff6b6b;">⚠ Module "${element.params.moduleName}" not found</span>`;
                    }
                } catch (error) {
                    console.error('Error loading module info:', error);
                    loadingBox.innerHTML = `<span style="color: #ff6b6b;">⚠ Error loading module information</span>`;
                }
            }, 100); // Small delay to show spinner
        }

        // Only append input if it wasn't already added (color inputs and key dropdowns are handled above)
        if (!inputDef.useKeyDropdown && inputDef.name !== 'color' && (!inputDef.label || !inputDef.label.toLowerCase().includes('color')) && inputDef.name !== 'code') {
            container.appendChild(input);
        }

        return { container, input };
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
            loadCSS("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/dialog/dialog.min.css")
        ]);

        // Load required JS files
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/codemirror.min.js");

        // Load modes
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/mode/javascript/javascript.min.js");

        // Load editing addons
        await Promise.all([
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/edit/closebrackets.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/edit/matchbrackets.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/hint/show-hint.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/hint/javascript-hint.min.js"),
            // Fold addons
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/fold/foldcode.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/fold/foldgutter.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/fold/brace-fold.min.js"),
            // Search addons
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/search/search.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/search/searchcursor.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/dialog/dialog.min.js")
        ]);
    }

    getConditionDefinitions() {
        // Get available keys for dropdown - call the method properly
        const availableKeys = this.getAvailableKeys();

        return [
            {
                type: 'ifCondition',
                name: 'If',
                description: 'Create a nested if statement with conditions and actions',
                category: 'Control',
                supportsNested: true,
                supportsNestedConditions: true,
                supportsNestedActions: true,
                supportsElse: true,
                inputs: [],
                toJavascriptCode: (params, element, indent = '') => {
                    let code = '';
                    if (element.conditions && element.conditions.length > 0) {
                        // Collect all condition code
                        const conditionCodes = element.conditions.map(cond => {
                            const def = this.getConditionDefinition(cond.type);
                            if (!def) return 'true';
                            // For nested if blocks, don't wrap them
                            if (def.supportsNested) {
                                return null; // Will be handled separately
                            }
                            return def.toJavascriptCode(cond.params, cond, '');
                        }).filter(c => c !== null);

                        // Check if we have nested if blocks
                        const nestedIfs = element.conditions.filter(cond => {
                            const def = this.getConditionDefinition(cond.type);
                            return def && def.supportsNested;
                        });

                        if (conditionCodes.length > 0) {
                            // Generate if statement with simple conditions
                            const operator = element.logicOperator === 'OR' ? ' || ' : ' && ';
                            code += `${indent}if (${conditionCodes.join(operator)}) {\n`;

                            // Add nested if blocks
                            if (nestedIfs.length > 0) {
                                nestedIfs.forEach(nestedIf => {
                                    const def = this.getConditionDefinition(nestedIf.type);
                                    if (def) {
                                        code += def.toJavascriptCode(nestedIf.params, nestedIf, indent + '    ');
                                    }
                                });
                            }

                            // Add actions
                            if (element.actions) {
                                element.actions.forEach(action => {
                                    const actionDef = this.getActionDefinition(action.type) || this.getConditionDefinition(action.type);
                                    if (actionDef) {
                                        const actionCode = actionDef.toJavascriptCode(action.params, action, indent + '    ');
                                        code += actionCode + '\n';
                                    }
                                });
                            }

                            code += `${indent}}`;

                            // Else block
                            if (element.elseActions && element.elseActions.length > 0) {
                                code += ` else {\n`;
                                element.elseActions.forEach(action => {
                                    const actionDef = this.getActionDefinition(action.type) || this.getConditionDefinition(action.type);
                                    if (actionDef) {
                                        const actionCode = actionDef.toJavascriptCode(action.params, action, indent + '    ');
                                        code += actionCode + '\n';
                                    }
                                });
                                code += `${indent}}`;
                            }
                        } else if (nestedIfs.length > 0) {
                            // Only nested ifs, no simple conditions
                            nestedIfs.forEach(nestedIf => {
                                const def = this.getConditionDefinition(nestedIf.type);
                                if (def) {
                                    code += def.toJavascriptCode(nestedIf.params, nestedIf, indent);
                                }
                            });
                        }
                    } else {
                        // No conditions, just execute actions
                        if (element.actions) {
                            element.actions.forEach(action => {
                                const actionDef = this.getActionDefinition(action.type) || this.getConditionDefinition(action.type);
                                if (actionDef) {
                                    const actionCode = actionDef.toJavascriptCode(action.params, action, indent);
                                    code += actionCode + '\n';
                                }
                            });
                        }
                    }
                    return code;
                }
            },
            {
                type: 'andCondition',
                name: 'And Group',
                description: 'Group conditions with AND logic - all must be true',
                category: 'Control',
                supportsNested: true,
                supportsNestedConditions: true,
                supportsNestedActions: true,
                inputs: [],
                toJavascriptCode: (params, element, indent = '') => {
                    let code = '';
                    if (element.conditions && element.conditions.length > 0) {
                        const conditionCodes = element.conditions.map(cond => {
                            const def = this.getConditionDefinition(cond.type);
                            return def ? `(${def.toJavascriptCode(cond.params, cond, '')})` : 'true';
                        }).filter(Boolean);

                        code += `${indent}if (${conditionCodes.join(' && ')}) {\n`;

                        if (element.actions) {
                            element.actions.forEach(action => {
                                const actionDef = this.getActionDefinition(action.type) || this.getConditionDefinition(action.type);
                                if (actionDef) {
                                    const actionCode = actionDef.toJavascriptCode(action.params, action, indent + '    ');
                                    code += actionCode + '\n';
                                }
                            });
                        }

                        code += `${indent}}`;
                    }
                    return code;
                }
            },
            {
                type: 'orCondition',
                name: 'Or Group',
                description: 'Group conditions with OR logic - at least one must be true',
                category: 'Control',
                supportsNested: true,
                supportsNestedConditions: true,
                supportsNestedActions: true,
                inputs: [],
                toJavascriptCode: (params, element, indent = '') => {
                    let code = '';
                    if (element.conditions && element.conditions.length > 0) {
                        const conditionCodes = element.conditions.map(cond => {
                            const def = this.getConditionDefinition(cond.type);
                            return def ? `(${def.toJavascriptCode(cond.params, cond, '')})` : 'false';
                        }).filter(Boolean);

                        code += `${indent}if (${conditionCodes.join(' || ')}) {\n`;

                        if (element.actions) {
                            element.actions.forEach(action => {
                                const actionDef = this.getActionDefinition(action.type) || this.getConditionDefinition(action.type);
                                if (actionDef) {
                                    const actionCode = actionDef.toJavascriptCode(action.params, action, indent + '    ');
                                    code += actionCode + '\n';
                                }
                            });
                        }

                        code += `${indent}}`;
                    }
                    return code;
                }
            },
            {
                type: 'keyDown',
                name: 'Key Down',
                description: 'Check if a key is currently pressed',
                category: 'Input',
                inputs: [
                    {
                        name: 'key',
                        type: 'string',
                        label: 'Key',
                        description: 'Key to check',
                        options: availableKeys,
                        useKeyDropdown: true
                    }
                ],
                toJavascriptCode: (params) => `window.input.keyDown("${params.key || ''}")`
            },
            {
                type: 'keyPressed',
                name: 'Key Pressed',
                description: 'Check if a key was just pressed this frame',
                category: 'Input',
                inputs: [
                    {
                        name: 'key',
                        type: 'string',
                        label: 'Key',
                        description: 'Key to check',
                        options: availableKeys,
                        useKeyDropdown: true
                    }
                ],
                toJavascriptCode: (params) => `window.input.keyPressed("${params.key || ''}")`
            },
            {
                type: 'keyReleased',
                name: 'Key Released',
                description: 'Check if a key was just released this frame',
                category: 'Input',
                inputs: [
                    {
                        name: 'key',
                        type: 'string',
                        label: 'Key',
                        description: 'Key to check',
                        options: availableKeys,
                        useKeyDropdown: true
                    }
                ],
                toJavascriptCode: (params) => `window.input.keyReleased("${params.key || ''}")`
            },
            {
                type: 'mouseDown',
                name: 'Mouse Down',
                description: 'Check if a mouse button is pressed',
                category: 'Input',
                inputs: [
                    { name: 'button', type: 'string', label: 'Button', options: ['left', 'right', 'middle'], default: 'left' }
                ],
                toJavascriptCode: (params) => `window.input.mouseDown("${params.button || 'left'}")`
            },
            {
                type: 'compareNumber',
                name: 'Compare',
                description: 'Compare a property with a value',
                category: 'Variables',
                inputs: [
                    { name: 'property', type: 'string', label: 'Property', description: 'Property name (e.g., "this.speed")' },
                    { name: 'operator', type: 'string', label: 'Operator', options: ['>', '<', '>=', '<=', '==', '!='], default: '>' },
                    { name: 'value', type: 'number', label: 'Value', default: 0 }
                ],
                toJavascriptCode: (params) => `${params.property || 'this.value'} ${params.operator || '>'} ${params.value || 0}`
            },
            {
                type: 'objectExists',
                name: 'Object Exists',
                description: 'Check if a GameObject exists',
                category: 'GameObject',
                inputs: [
                    { name: 'name', type: 'string', label: 'Name' }
                ],
                toJavascriptCode: (params) => `this.getGameObjectByName("${params.name || ''}") !== null`
            },
            {
                type: 'collision',
                name: 'Collision',
                description: 'Check for collision with another object',
                inputs: [
                    { name: 'name', type: 'string', label: 'Name' },
                    { name: 'x', type: 'number', label: 'X Offset', default: 0 },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0 }
                ],
                toJavascriptCode: (params) => `this.objectCollision("${params.name || ''}", ${params.x || 0}, ${params.y || 0}) !== null`
            },
            {
                type: 'hasModule',
                name: 'Has Module',
                description: 'Check if this GameObject has a specific module',
                category: 'Modules',
                inputs: [
                    {
                        name: 'moduleName',
                        type: 'string',
                        label: 'Module Class'
                    }
                ],
                toJavascriptCode: (params) => `this.getModule(${params.moduleName || 'Module'}) !== null`
            },
            {
                type: 'compareModuleProperty',
                name: 'Compare Module Property',
                description: 'Compare a module property with a value',
                category: 'Modules',
                inputs: [
                    {
                        name: 'moduleName',
                        type: 'string',
                        label: 'Module Class'
                    },
                    { name: 'propertyName', type: 'string', label: 'Property Name' },
                    { name: 'operator', type: 'string', label: 'Operator', options: ['>', '<', '>=', '<=', '==', '!='], default: '==' },
                    { name: 'value', type: 'string', label: 'Value' }
                ],
                toJavascriptCode: (params) => {
                    return `(() => { const m = this.getModule(${params.moduleName || 'Module'}); return m && m.${params.propertyName || 'property'} ${params.operator || '=='} ${params.value || '0'}; })()`;
                }
            },
            {
                type: 'customCondition',
                name: 'Custom',
                description: 'Write custom JavaScript condition',
                category: 'Debug',
                inputs: [
                    { name: 'code', type: 'string', label: 'Code' }
                ],
                toJavascriptCode: (params) => params.code || 'true'
            }
        ];
    }

    getActionDefinitions() {
        const self = this; // Capture 'this' reference
        return [
            {
                type: 'forLoop',
                name: 'For Loop',
                description: 'Create a for loop that repeats actions',
                category: 'Control',
                supportsNested: true,
                supportsNestedActions: true,
                inputs: [
                    { name: 'variable', type: 'string', label: 'Variable Name', default: 'i', description: 'Loop counter variable' },
                    { name: 'start', type: 'number', label: 'Start', default: 0 },
                    { name: 'end', type: 'number', label: 'End', default: 10 },
                    { name: 'step', type: 'number', label: 'Step', default: 1 }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    let code = `${indent}for (let ${params.variable || 'i'} = ${params.start || 0}; ${params.variable || 'i'} < ${params.end || 10}; ${params.variable || 'i'} += ${params.step || 1}) {\n`;

                    if (element.actions) {
                        element.actions.forEach(action => {
                            const def = self.getActionDefinition(action.type) || self.getConditionDefinition(action.type);
                            if (def) {
                                const actionCode = def.toJavascriptCode(action.params, action, indent + '    ');
                                code += actionCode + '\n';
                            }
                        });
                    }

                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'forEachLoop',
                name: 'For Each Loop',
                description: 'Loop through array elements',
                category: 'Control',
                supportsNested: true,
                supportsNestedActions: true,
                inputs: [
                    { name: 'variable', type: 'string', label: 'Variable Name', default: 'item', description: 'Variable for each element' },
                    { name: 'array', type: 'string', label: 'Array', default: 'this.items', description: 'Array to iterate' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    let code = `${indent}for (const ${params.variable || 'item'} of ${params.array || 'this.items'}) {\n`;

                    if (element.actions) {
                        element.actions.forEach(action => {
                            const def = self.getActionDefinition(action.type) || self.getConditionDefinition(action.type);
                            if (def) {
                                const actionCode = def.toJavascriptCode(action.params, action, indent + '    ');
                                code += actionCode + '\n';
                            }
                        });
                    }

                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'whileLoop',
                name: 'While Loop',
                description: 'Repeat actions while a condition is true',
                category: 'Control',
                supportsNested: true,
                supportsNestedActions: true,
                inputs: [
                    { name: 'condition', type: 'string', label: 'Condition', default: 'true', description: 'Loop continues while this is true' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    let code = `${indent}while (${params.condition || 'true'}) {\n`;

                    if (element.actions) {
                        element.actions.forEach(action => {
                            const def = self.getActionDefinition(action.type) || self.getConditionDefinition(action.type);
                            if (def) {
                                const actionCode = def.toJavascriptCode(action.params, action, indent + '    ');
                                code += actionCode + '\n';
                            }
                        });
                    }

                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'break',
                name: 'Break',
                description: 'Exit the current loop',
                category: 'Control',
                inputs: [],
                toJavascriptCode: (params, element, indent = '') => `${indent}break;`
            },
            {
                type: 'continue',
                name: 'Continue',
                description: 'Skip to the next iteration of the loop',
                category: 'Control',
                inputs: [],
                toJavascriptCode: (params, element, indent = '') => `${indent}continue;`
            },
            {
                type: 'return',
                name: 'Return',
                description: 'Return from the current method',
                category: 'Control',
                inputs: [
                    { name: 'value', type: 'string', label: 'Return Value (optional)', default: '' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    if (params.value && params.value.trim()) {
                        return `${indent}return ${params.value};`;
                    }
                    return `${indent}return;`;
                }
            },
            {
                type: 'nestedBlock',
                name: 'Block',
                description: 'Create a block that can contain nested actions',
                category: 'Control',
                supportsNested: true,
                supportsNestedActions: true,
                inputs: [
                    { name: 'label', type: 'string', label: 'Label (optional)' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    let code = '';
                    if (params.label) {
                        code += `${indent}// ${params.label}\n`;
                    }
                    code += `${indent}{\n`;
                    if (element.actions) {
                        element.actions.forEach(action => {
                            const def = self.getActionDefinition(action.type) || self.getConditionDefinition(action.type);
                            if (def) {
                                const actionCode = def.toJavascriptCode(action.params, action, indent + '    ');
                                code += actionCode + '\n';
                            }
                        });
                    }
                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'setPosition',
                name: 'Set Position',
                description: 'Set the GameObject position',
                category: 'Transform',
                inputs: [
                    { name: 'x', type: 'number', label: 'X', default: 0 },
                    { name: 'y', type: 'number', label: 'Y', default: 0 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}this.gameObject.position.x = ${params.x || 0};\n${indent}this.gameObject.position.y = ${params.y || 0};`
            },
            {
                type: 'move',
                name: 'Move',
                description: 'Move the GameObject by an offset',
                category: 'Transform',
                inputs: [
                    { name: 'x', type: 'number', label: 'X', default: 0 },
                    { name: 'y', type: 'number', label: 'Y', default: 0 },
                    { name: 'useDeltaTime', type: 'boolean', label: 'Delta Time', default: true }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const multiplier = params.useDeltaTime ? ' * deltaTime' : '';
                    return `${indent}this.gameObject.position.x += ${params.x || 0}${multiplier};\n${indent}this.gameObject.position.y += ${params.y || 0}${multiplier};`;
                }
            },
            {
                type: 'setAngle',
                name: 'Set Angle',
                description: 'Set rotation angle',
                category: 'Transform',
                inputs: [
                    { name: 'angle', type: 'number', label: 'Angle', default: 0 }
                ],
                toJavascriptCode: (params, element, indent = '') => `${indent}this.gameObject.angle = ${params.angle || 0};`
            },
            {
                type: 'rotate',
                name: 'Rotate',
                description: 'Rotate the GameObject',
                category: 'Transform',
                inputs: [
                    { name: 'amount', type: 'number', label: 'Amount', default: 1 },
                    { name: 'useDeltaTime', type: 'boolean', label: 'Delta Time', default: true }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const multiplier = params.useDeltaTime ? ' * deltaTime' : '';
                    return `${indent}this.gameObject.angle += ${params.amount || 1}${multiplier};`;
                }
            },
            {
                type: 'setScale',
                name: 'Set Scale',
                description: 'Set the GameObject scale',
                category: 'Transform',
                inputs: [
                    { name: 'x', type: 'number', label: 'X', default: 1 },
                    { name: 'y', type: 'number', label: 'Y', default: 1 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}this.gameObject.scale.x = ${params.x || 1};\n${indent}this.gameObject.scale.y = ${params.y || 1};`
            },
            {
                type: 'destroyObject',
                name: 'Destroy',
                description: 'Destroy a GameObject',
                category: 'GameObject',
                inputs: [
                    { name: 'target', type: 'string', label: 'Target', options: ['this', 'name'], default: 'this' },
                    { name: 'name', type: 'string', label: 'Name' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    if (params.target === 'name' && params.name) {
                        return `${indent}const obj = this.getGameObjectByName("${params.name}");\n${indent}if (obj) obj.destroy();`;
                    }
                    return `${indent}this.gameObject.destroy();`;
                }
            },
            {
                type: 'createInstance',
                name: 'Create Instance',
                description: 'Create a new GameObject',
                category: 'GameObject',
                inputs: [
                    { name: 'x', type: 'number', label: 'X', default: 0 },
                    { name: 'y', type: 'number', label: 'Y', default: 0 },
                    { name: 'name', type: 'string', label: 'Name' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}this.instanceCreate(${params.x || 0}, ${params.y || 0}, "${params.name || ''}", false);`
            },
            {
                type: 'setProperty',
                name: 'Set Property',
                description: 'Set a custom property value',
                category: 'Variables',
                inputs: [
                    { name: 'property', type: 'string', label: 'Property' },
                    { name: 'value', type: 'string', label: 'Value' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.property || 'this.value'} = ${params.value || 0};`
            },
            {
                type: 'getModule',
                name: 'Get Module',
                description: 'Get a reference to a module on this GameObject',
                category: 'Modules',
                inputs: [
                    {
                        name: 'moduleName',
                        type: 'string',
                        label: 'Module Class',
                        description: 'Name of the module class to get'
                    },
                    { name: 'variableName', type: 'string', label: 'Store in Variable', default: 'module' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}const ${params.variableName || 'module'} = this.getModule(${params.moduleName || 'Module'});`
            },
            {
                type: 'setModuleProperty',
                name: 'Set Module Property',
                description: 'Set a property on a module',
                category: 'Modules',
                inputs: [
                    {
                        name: 'moduleName',
                        type: 'string',
                        label: 'Module Class'
                    },
                    { name: 'propertyName', type: 'string', label: 'Property Name' },
                    { name: 'value', type: 'string', label: 'Value' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    return `${indent}const module = this.getModule(${params.moduleName || 'Module'});\n${indent}if (module) module.${params.propertyName || 'property'} = ${params.value || '0'};`;
                }
            },
            {
                type: 'getModuleProperty',
                name: 'Get Module Property',
                description: 'Get a property value from a module',
                category: 'Modules',
                inputs: [
                    {
                        name: 'moduleName',
                        type: 'string',
                        label: 'Module Class'
                    },
                    { name: 'propertyName', type: 'string', label: 'Property Name' },
                    { name: 'variableName', type: 'string', label: 'Store in Variable', default: 'value' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    return `${indent}const module = this.getModule(${params.moduleName || 'Module'});\n${indent}const ${params.variableName || 'value'} = module ? module.${params.propertyName || 'property'} : null;`;
                }
            },
            {
                type: 'callModuleMethod',
                name: 'Call Module Method',
                description: 'Call a method on a module',
                category: 'Modules',
                inputs: [
                    {
                        name: 'moduleName',
                        type: 'string',
                        label: 'Module Class',
                        description: 'Select the module class'
                    },
                    {
                        name: 'methodName',
                        type: 'string',
                        label: 'Method Name',
                        description: 'Select the method to call',
                        isDynamic: true // Will be populated based on selected module
                    },
                    {
                        name: 'params',
                        type: 'string',
                        label: 'Parameters',
                        description: 'Comma-separated parameters to pass to the method',
                        default: ''
                    }
                ],
                toJavascriptCode: (params) => {
                    const paramsStr = params.params ? `, ${params.params}` : '';
                    return `(() => { const m = this.getModule(${params.moduleName || 'Module'}); if (m && m.${params.methodName || 'method'}) { m.${params.methodName}(${params.params || ''}); } })();`;
                }
            },
            {
                type: 'setModuleVariable',
                name: 'Set Module Variable',
                description: 'Set a variable on a module',
                category: 'Modules',
                inputs: [
                    {
                        name: 'moduleName',
                        type: 'string',
                        label: 'Module Class',
                        description: 'Select the module class'
                    },
                    {
                        name: 'variableName',
                        type: 'string',
                        label: 'Variable Name',
                        description: 'Select the variable to set',
                        isDynamic: true // Will be populated based on selected module
                    },
                    {
                        name: 'value',
                        type: 'string',
                        label: 'Value',
                        description: 'Value to set (will be evaluated as JavaScript)'
                    }
                ],
                toJavascriptCode: (params) => {
                    return `(() => { const m = this.getModule(${params.moduleName || 'Module'}); if (m) { m.${params.variableName || 'variable'} = ${params.value || '0'}; } })();`;
                }
            },
            {
                type: 'getModuleVariable',
                name: 'Get Module Variable',
                description: 'Get a variable value from a module',
                category: 'Modules',
                inputs: [
                    {
                        name: 'moduleName',
                        type: 'string',
                        label: 'Module Class',
                        description: 'Select the module class'
                    },
                    {
                        name: 'variableName',
                        type: 'string',
                        label: 'Variable Name',
                        description: 'Select the variable to get',
                        isDynamic: true // Will be populated based on selected module
                    }
                ],
                toJavascriptCode: (params) => {
                    return `(() => { const m = this.getModule(${params.moduleName || 'Module'}); return m ? m.${params.variableName || 'variable'} : undefined; })()`;
                }
            },
            // DRAWING ACTIONS
            {
                type: 'saveCanvasState',
                name: 'Save Canvas State',
                description: 'Save the current canvas state before making changes',
                category: 'Drawing',
                inputs: [],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    return `${indent}${ctx}.save();`;
                }
            },
            {
                type: 'restoreCanvasState',
                name: 'Restore Canvas State',
                description: 'Restore the previously saved canvas state after making changes',
                category: 'Drawing',
                inputs: [],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    return `${indent}${ctx}.restore();`;
                }
            },
            {
                type: 'resetTransform',
                name: 'Reset Transform',
                description: 'Reset transformation to draw in world/screen space instead of relative to game object',
                category: 'Drawing',
                inputs: [],
                toJavascriptCode: (params, element, indent = '') => {
                    return `${indent}ctx.setTransform(1, 0, 0, 1, 0, 0);`;
                }
            },
            {
                type: 'setTransform',
                name: 'Set Transform',
                description: 'Manually set the transformation matrix',
                category: 'Drawing',
                inputs: [
                    { name: 'a', type: 'number', label: 'Scale X', default: 1, description: 'Horizontal scaling' },
                    { name: 'b', type: 'number', label: 'Skew Y', default: 0, description: 'Vertical skewing' },
                    { name: 'c', type: 'number', label: 'Skew X', default: 0, description: 'Horizontal skewing' },
                    { name: 'd', type: 'number', label: 'Scale Y', default: 1, description: 'Vertical scaling' },
                    { name: 'e', type: 'number', label: 'Translate X', default: 0, description: 'Horizontal translation' },
                    { name: 'f', type: 'number', label: 'Translate Y', default: 0, description: 'Vertical translation' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    return `${indent}ctx.setTransform(${params.a || 1}, ${params.b || 0}, ${params.c || 0}, ${params.d || 1}, ${params.e || 0}, ${params.f || 0});`;
                }
            },
            {
                type: 'translate',
                name: 'Translate',
                description: 'Move the drawing origin',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X', default: 0 },
                    { name: 'y', type: 'number', label: 'Y', default: 0 }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    return `${indent}ctx.translate(${params.x || 0}, ${params.y || 0});`;
                }
            },
            {
                type: 'rotateCanvas',
                name: 'Rotate Canvas',
                description: 'Rotate the drawing context',
                category: 'Drawing',
                inputs: [
                    { name: 'angle', type: 'number', label: 'Angle (degrees)', default: 0 }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    return `${indent}ctx.rotate(${params.angle || 0} * Math.PI / 180);`;
                }
            },
            {
                type: 'scaleCanvas',
                name: 'Scale Canvas',
                description: 'Scale the drawing context',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'Scale X', default: 1 },
                    { name: 'y', type: 'number', label: 'Scale Y', default: 1 }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    return `${indent}ctx.scale(${params.x || 1}, ${params.y || 1});`;
                }
            },
            {
                type: 'drawGradientRectangle',
                name: 'Draw Gradient Rectangle',
                description: 'Draw a rectangle with gradient fill',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0 },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0 },
                    { name: 'width', type: 'number', label: 'Width', default: 100 },
                    { name: 'height', type: 'number', label: 'Height', default: 100 },
                    { name: 'color1', type: 'string', label: 'Color 1', default: '#ff0000' },
                    { name: 'color2', type: 'string', label: 'Color 2', default: '#0000ff' },
                    { name: 'type', type: 'string', label: 'Type', options: ['linear-horizontal', 'linear-vertical', 'radial'], default: 'linear-vertical' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    const x = (params.x || 0) - (params.width || 100) / 2;
                    const y = (params.y || 0) - (params.height || 100) / 2;
                    const w = params.width || 100;
                    const h = params.height || 100;
                    let code = `${indent}// Draw gradient rectangle (${w}×${h}) at offset (${params.x || 0}, ${params.y || 0})\n`;
                    code += `${indent}{\n`;
                    code += `${indent}    let gradient;\n`;
                    if (params.type === 'linear-horizontal') {
                        code += `${indent}    gradient = ${ctx}.createLinearGradient(${x}, ${y}, ${x} + ${w}, ${y});\n`;
                    } else if (params.type === 'radial') {
                        code += `${indent}    gradient = ${ctx}.createRadialGradient(${x} + ${w}/2, ${y} + ${h}/2, 0, ${x} + ${w}/2, ${y} + ${h}/2, ${Math.max(w, h)}/2);\n`;
                    } else {
                        code += `${indent}    gradient = ${ctx}.createLinearGradient(${x}, ${y}, ${x}, ${y} + ${h});\n`;
                    }
                    code += `${indent}    gradient.addColorStop(0, "${params.color1 || '#ff0000'}");\n`;
                    code += `${indent}    gradient.addColorStop(1, "${params.color2 || '#0000ff'}");\n`;
                    code += `${indent}    ${ctx}.fillStyle = gradient;\n`;
                    code += `${indent}    ${ctx}.fillRect(${x}, ${y}, ${w}, ${h});\n`;
                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'drawGradientCircle',
                name: 'Draw Gradient Circle',
                description: 'Draw a circle with radial gradient',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0 },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0 },
                    { name: 'radius', type: 'number', label: 'Radius', default: 50 },
                    { name: 'color1', type: 'string', label: 'Center Color', default: '#ffffff' },
                    { name: 'color2', type: 'string', label: 'Edge Color', default: '#000000' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}// Draw gradient circle (radius: ${params.radius || 50}) at offset (${params.x || 0}, ${params.y || 0})\n`;
                    code += `${indent}{\n`;
                    code += `${indent}    const gradient = ${ctx}.createRadialGradient(${params.x || 0}, ${params.y || 0}, 0, ${params.x || 0}, ${params.y || 0}, ${params.radius || 50});\n`;
                    code += `${indent}    gradient.addColorStop(0, "${params.color1 || '#ffffff'}");\n`;
                    code += `${indent}    gradient.addColorStop(1, "${params.color2 || '#000000'}");\n`;
                    code += `${indent}    ${ctx}.fillStyle = gradient;\n`;
                    code += `${indent}    ${ctx}.beginPath();\n`;
                    code += `${indent}    ${ctx}.arc(${params.x || 0}, ${params.y || 0}, ${params.radius || 50}, 0, Math.PI * 2);\n`;
                    code += `${indent}    ${ctx}.fill();\n`;
                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'drawDot',
                name: 'Draw Dot',
                description: 'Draw a small dot (circle) at a position',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0 },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0 },
                    { name: 'radius', type: 'number', label: 'Radius', default: 3 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}// Draw dot at offset (${params.x || 0}, ${params.y || 0})\n`;
                    code += `${indent}${ctx}.beginPath();\n`;
                    code += `${indent}${ctx}.arc(${params.x || 0}, ${params.y || 0}, ${params.radius || 3}, 0, Math.PI * 2);\n`;
                    code += `${indent}${ctx}.fillStyle = "${params.color || '#ffffff'}";\n`;
                    code += `${indent}${ctx}.fill();`;
                    return code;
                }
            },
            {
                type: 'drawCrosshair',
                name: 'Draw Crosshair',
                description: 'Draw a crosshair at a position',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0 },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0 },
                    { name: 'size', type: 'number', label: 'Size', default: 10 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'lineWidth', type: 'number', label: 'Line Width', default: 2 }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    const size = params.size || 10;
                    let code = `${indent}// Draw crosshair (size: ${size}) at offset (${params.x || 0}, ${params.y || 0})\n`;
                    code += `${indent}${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                    code += `${indent}${ctx}.lineWidth = ${params.lineWidth || 2};\n`;
                    code += `${indent}${ctx}.beginPath();\n`;
                    code += `${indent}${ctx}.moveTo(${params.x || 0} - ${size}, ${params.y || 0});\n`;
                    code += `${indent}${ctx}.lineTo(${params.x || 0} + ${size}, ${params.y || 0});\n`;
                    code += `${indent}${ctx}.moveTo(${params.x || 0}, ${params.y || 0} - ${size});\n`;
                    code += `${indent}${ctx}.lineTo(${params.x || 0}, ${params.y || 0} + ${size});\n`;
                    code += `${indent}${ctx}.stroke();`;
                    return code;
                }
            },
            {
                type: 'drawHexagon',
                name: 'Draw Hexagon',
                description: 'Draw a regular hexagon',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0 },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0 },
                    { name: 'radius', type: 'number', label: 'Radius', default: 50 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'filled', type: 'boolean', label: 'Filled', default: true }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}// Draw ${params.filled !== false ? 'filled' : 'outlined'} hexagon (radius: ${params.radius || 50}) at offset (${params.x || 0}, ${params.y || 0})\n`;
                    code += `${indent}{\n`;
                    code += `${indent}    ${ctx}.beginPath();\n`;
                    code += `${indent}    for (let i = 0; i < 6; i++) {\n`;
                    code += `${indent}        const angle = (i * Math.PI / 3) - Math.PI / 2;\n`;
                    code += `${indent}        const x = ${params.x || 0} + ${params.radius || 50} * Math.cos(angle);\n`;
                    code += `${indent}        const y = ${params.y || 0} + ${params.radius || 50} * Math.sin(angle);\n`;
                    code += `${indent}        if (i === 0) ${ctx}.moveTo(x, y);\n`;
                    code += `${indent}        else ${ctx}.lineTo(x, y);\n`;
                    code += `${indent}    }\n`;
                    code += `${indent}    ${ctx}.closePath();\n`;
                    if (params.filled) {
                        code += `${indent}    ${ctx}.fillStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}    ${ctx}.fill();\n`;
                    } else {
                        code += `${indent}    ${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}    ${ctx}.stroke();\n`;
                    }
                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'drawRegularPolygon',
                name: 'Draw Regular Polygon',
                description: 'Draw a regular polygon with any number of sides',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0 },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0 },
                    { name: 'sides', type: 'number', label: 'Number of Sides', default: 5, min: 3 },
                    { name: 'radius', type: 'number', label: 'Radius', default: 50 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'filled', type: 'boolean', label: 'Filled', default: true }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}// Draw ${params.filled !== false ? 'filled' : 'outlined'} ${params.sides || 5}-sided polygon (radius: ${params.radius || 50}) at offset (${params.x || 0}, ${params.y || 0})\n`;
                    code += `${indent}{\n`;
                    code += `${indent}    ${ctx}.beginPath();\n`;
                    code += `${indent}    const sides = ${params.sides || 5};\n`;
                    code += `${indent}    for (let i = 0; i < sides; i++) {\n`;
                    code += `${indent}        const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;\n`;
                    code += `${indent}        const x = ${params.x || 0} + ${params.radius || 50} * Math.cos(angle);\n`;
                    code += `${indent}        const y = ${params.y || 0} + ${params.radius || 50} * Math.sin(angle);\n`;
                    code += `${indent}        if (i === 0) ${ctx}.moveTo(x, y);\n`;
                    code += `${indent}        else ${ctx}.lineTo(x, y);\n`;
                    code += `${indent}    }\n`;
                    code += `${indent}    ${ctx}.closePath();\n`;
                    if (params.filled) {
                        code += `${indent}    ${ctx}.fillStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}    ${ctx}.fill();\n`;
                    } else {
                        code += `${indent}    ${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}    ${ctx}.stroke();\n`;
                    }
                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'drawSpiral',
                name: 'Draw Spiral',
                description: 'Draw a spiral pattern',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0 },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0 },
                    { name: 'startRadius', type: 'number', label: 'Start Radius', default: 5 },
                    { name: 'endRadius', type: 'number', label: 'End Radius', default: 50 },
                    { name: 'rotations', type: 'number', label: 'Rotations', default: 3 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'lineWidth', type: 'number', label: 'Line Width', default: 2 }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}// Draw spiral (${params.rotations || 3} rotations, radius ${params.startRadius || 5}-${params.endRadius || 50}) at offset (${params.x || 0}, ${params.y || 0})\n`;
                    code += `${indent}{\n`;
                    code += `${indent}    ${ctx}.beginPath();\n`;
                    code += `${indent}    ${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                    code += `${indent}    ${ctx}.lineWidth = ${params.lineWidth || 2};\n`;
                    code += `${indent}    const steps = 100;\n`;
                    code += `${indent}    const startRadius = ${params.startRadius || 5};\n`;
                    code += `${indent}    const endRadius = ${params.endRadius || 50};\n`;
                    code += `${indent}    const rotations = ${params.rotations || 3};\n`;
                    code += `${indent}    for (let i = 0; i <= steps; i++) {\n`;
                    code += `${indent}        const t = i / steps;\n`;
                    code += `${indent}        const angle = t * rotations * 2 * Math.PI;\n`;
                    code += `${indent}        const radius = startRadius + (endRadius - startRadius) * t;\n`;
                    code += `${indent}        const x = ${params.x || 0} + radius * Math.cos(angle);\n`;
                    code += `${indent}        const y = ${params.y || 0} + radius * Math.sin(angle);\n`;
                    code += `${indent}        if (i === 0) ${ctx}.moveTo(x, y);\n`;
                    code += `${indent}        else ${ctx}.lineTo(x, y);\n`;
                    code += `${indent}    }\n`;
                    code += `${indent}    ${ctx}.stroke();\n`;
                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'drawRing',
                name: 'Draw Ring',
                description: 'Draw a ring (donut shape)',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0 },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0 },
                    { name: 'outerRadius', type: 'number', label: 'Outer Radius', default: 50 },
                    { name: 'innerRadius', type: 'number', label: 'Inner Radius', default: 30 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}// Draw ring (outer radius: ${params.outerRadius || 50}, inner radius: ${params.innerRadius || 30}) at offset (${params.x || 0}, ${params.y || 0})\n`;
                    code += `${indent}{\n`;
                    code += `${indent}    ${ctx}.beginPath();\n`;
                    code += `${indent}    ${ctx}.arc(${params.x || 0}, ${params.y || 0}, ${params.outerRadius || 50}, 0, Math.PI * 2);\n`;
                    code += `${indent}    ${ctx}.arc(${params.x || 0}, ${params.y || 0}, ${params.innerRadius || 30}, 0, Math.PI * 2, true);\n`;
                    code += `${indent}    ${ctx}.fillStyle = "${params.color || '#ffffff'}";\n`;
                    code += `${indent}    ${ctx}.fill();\n`;
                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'drawRectangle',
                name: 'Draw Rectangle',
                description: 'Draw a rectangle centered at game object (x/y are offsets from center)',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0, description: 'Horizontal offset from game object center' },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0, description: 'Vertical offset from game object center' },
                    { name: 'width', type: 'number', label: 'Width', default: 100 },
                    { name: 'height', type: 'number', label: 'Height', default: 100 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'filled', type: 'boolean', label: 'Filled', default: true }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    const x = (params.x || 0) - (params.width || 100) / 2;
                    const y = (params.y || 0) - (params.height || 100) / 2;
                    let code = `${indent}// Draw ${params.filled !== false ? 'filled' : 'outlined'} rectangle (${params.width || 100}×${params.height || 100}) at offset (${params.x || 0}, ${params.y || 0})\n`;
                    if (params.filled) {
                        code += `${indent}${ctx}.fillStyle = "${params.color || '#ffffff'}";\n${indent}${ctx}.fillRect(${x}, ${y}, ${params.width || 100}, ${params.height || 100});`;
                    } else {
                        code += `${indent}${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n${indent}${ctx}.strokeRect(${x}, ${y}, ${params.width || 100}, ${params.height || 100});`;
                    }
                    return code;
                }
            },
            {
                type: 'drawCircle',
                name: 'Draw Circle',
                description: 'Draw a circle centered at game object (x/y are offsets from center)',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0, description: 'Horizontal offset from game object center' },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0, description: 'Vertical offset from game object center' },
                    { name: 'radius', type: 'number', label: 'Radius', default: 50 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'filled', type: 'boolean', label: 'Filled', default: true }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}// Draw ${params.filled !== false ? 'filled' : 'outlined'} circle (radius: ${params.radius || 50}) at offset (${params.x || 0}, ${params.y || 0})\n`;
                    code += `${indent}${ctx}.beginPath();\n`;
                    code += `${indent}${ctx}.arc(${params.x || 0}, ${params.y || 0}, ${params.radius || 50}, 0, Math.PI * 2);\n`;
                    if (params.filled) {
                        code += `${indent}${ctx}.fillStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}${ctx}.fill();`;
                    } else {
                        code += `${indent}${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}${ctx}.stroke();`;
                    }
                    return code;
                }
            },
            {
                type: 'drawEllipse',
                name: 'Draw Ellipse',
                description: 'Draw an ellipse centered at game object (x/y are offsets from center)',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0, description: 'Horizontal offset from game object center' },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0, description: 'Vertical offset from game object center' },
                    { name: 'radiusX', type: 'number', label: 'Radius X', default: 75 },
                    { name: 'radiusY', type: 'number', label: 'Radius Y', default: 50 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'filled', type: 'boolean', label: 'Filled', default: true }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}// Draw ${params.filled !== false ? 'filled' : 'outlined'} ellipse (${params.radiusX || 75}×${params.radiusY || 50}) at offset (${params.x || 0}, ${params.y || 0})\n`;
                    code += `${indent}${ctx}.beginPath();\n`;
                    code += `${indent}${ctx}.ellipse(${params.x || 0}, ${params.y || 0}, ${params.radiusX || 75}, ${params.radiusY || 50}, 0, 0, Math.PI * 2);\n`;
                    if (params.filled) {
                        code += `${indent}${ctx}.fillStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}${ctx}.fill();`;
                    } else {
                        code += `${indent}${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}${ctx}.stroke();`;
                    }
                    return code;
                }
            },
            {
                type: 'drawLine',
                name: 'Draw Line',
                description: 'Draw a line from the game object center (coordinates are offsets)',
                category: 'Drawing',
                inputs: [
                    { name: 'x1', type: 'number', label: 'X1 Offset', default: 0, description: 'Start X offset from center' },
                    { name: 'y1', type: 'number', label: 'Y1 Offset', default: 0, description: 'Start Y offset from center' },
                    { name: 'x2', type: 'number', label: 'X2 Offset', default: 100, description: 'End X offset from center' },
                    { name: 'y2', type: 'number', label: 'Y2 Offset', default: 100, description: 'End Y offset from center' },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'lineWidth', type: 'number', label: 'Line Width', default: 1 }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}// Draw line from (${params.x1 || 0}, ${params.y1 || 0}) to (${params.x2 || 100}, ${params.y2 || 100})\n`;
                    code += `${indent}${ctx}.beginPath();\n`;
                    code += `${indent}${ctx}.moveTo(${params.x1 || 0}, ${params.y1 || 0});\n`;
                    code += `${indent}${ctx}.lineTo(${params.x2 || 100}, ${params.y2 || 100});\n`;
                    code += `${indent}${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                    code += `${indent}${ctx}.lineWidth = ${params.lineWidth || 1};\n`;
                    code += `${indent}${ctx}.stroke();`;
                    return code;
                }
            },
            {
                type: 'drawText',
                name: 'Draw Text',
                description: 'Draw text centered at game object (x/y are offsets from center)',
                category: 'Drawing',
                inputs: [
                    { name: 'text', type: 'string', label: 'Text', default: 'Hello' },
                    { name: 'x', type: 'number', label: 'X Offset', default: 0, description: 'Horizontal offset from game object center' },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0, description: 'Vertical offset from game object center' },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'font', type: 'string', label: 'Font', default: '16px Arial' },
                    { name: 'filled', type: 'boolean', label: 'Filled', default: true }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}// Draw text "${params.text || 'Hello'}" at offset (${params.x || 0}, ${params.y || 0})\n`;
                    code += `${indent}${ctx}.font = "${params.font || '16px Arial'}";\n`;
                    if (params.filled) {
                        code += `${indent}${ctx}.fillStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}${ctx}.fillText("${params.text || 'Hello'}", ${params.x || 0}, ${params.y || 0});`;
                    } else {
                        code += `${indent}${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}${ctx}.strokeText("${params.text || 'Hello'}", ${params.x || 0}, ${params.y || 0});`;
                    }
                    return code;
                }
            },
            {
                type: 'drawPolygon',
                name: 'Draw Polygon',
                description: 'Draw a polygon centered at game object (points are offsets from center)',
                category: 'Drawing',
                inputs: [
                    { name: 'points', type: 'string', label: 'Points (x1,y1,x2,y2,...)', default: '0,0,100,0,50,100', description: 'Comma-separated coordinates as offsets from center' },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'filled', type: 'boolean', label: 'Filled', default: true }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    const pointsStr = params.points || '0,0,100,0,50,100';
                    let code = `${indent}{\n`;
                    code += `${indent}    const points = "${pointsStr}".split(',').map(Number);\n`;
                    code += `${indent}    ${ctx}.beginPath();\n`;
                    code += `${indent}    ${ctx}.moveTo(points[0], points[1]);\n`;
                    code += `${indent}    for (let i = 2; i < points.length; i += 2) {\n`;
                    code += `${indent}        ${ctx}.lineTo(points[i], points[i + 1]);\n`;
                    code += `${indent}    }\n`;
                    code += `${indent}    ${ctx}.closePath();\n`;
                    if (params.filled) {
                        code += `${indent}    ${ctx}.fillStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}    ${ctx}.fill();\n`;
                    } else {
                        code += `${indent}    ${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}    ${ctx}.stroke();\n`;
                    }
                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'drawArc',
                name: 'Draw Arc',
                description: 'Draw an arc or pie slice',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0 },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0 },
                    { name: 'radius', type: 'number', label: 'Radius', default: 50 },
                    { name: 'startAngle', type: 'number', label: 'Start Angle (degrees)', default: 0 },
                    { name: 'endAngle', type: 'number', label: 'End Angle (degrees)', default: 90 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'filled', type: 'boolean', label: 'Filled', default: true }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    const startRad = `${params.startAngle || 0} * Math.PI / 180`;
                    const endRad = `${params.endAngle || 90} * Math.PI / 180`;
                    let code = `${indent}${ctx}.beginPath();\n`;
                    code += `${indent}${ctx}.arc(${params.x || 0}, ${params.y || 0}, ${params.radius || 50}, ${startRad}, ${endRad});\n`;
                    if (params.filled) {
                        code += `${indent}${ctx}.lineTo(${params.x || 0}, ${params.y || 0});\n`;
                        code += `${indent}${ctx}.closePath();\n`;
                        code += `${indent}${ctx}.fillStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}${ctx}.fill();`;
                    } else {
                        code += `${indent}${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}${ctx}.stroke();`;
                    }
                    return code;
                }
            },
            {
                type: 'drawRoundedRectangle',
                name: 'Draw Rounded Rectangle',
                description: 'Draw a rectangle with rounded corners',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0 },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0 },
                    { name: 'width', type: 'number', label: 'Width', default: 100 },
                    { name: 'height', type: 'number', label: 'Height', default: 100 },
                    { name: 'radius', type: 'number', label: 'Corner Radius', default: 10 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'filled', type: 'boolean', label: 'Filled', default: true }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    const x = (params.x || 0) - (params.width || 100) / 2;
                    const y = (params.y || 0) - (params.height || 100) / 2;
                    const w = params.width || 100;
                    const h = params.height || 100;
                    const r = params.radius || 10;
                    let code = `${indent}${ctx}.beginPath();\n`;
                    code += `${indent}${ctx}.moveTo(${x} + ${r}, ${y});\n`;
                    code += `${indent}${ctx}.lineTo(${x} + ${w} - ${r}, ${y});\n`;
                    code += `${indent}${ctx}.arcTo(${x} + ${w}, ${y}, ${x} + ${w}, ${y} + ${r}, ${r});\n`;
                    code += `${indent}${ctx}.lineTo(${x} + ${w}, ${y} + ${h} - ${r});\n`;
                    code += `${indent}${ctx}.arcTo(${x} + ${w}, ${y} + ${h}, ${x} + ${w} - ${r}, ${y} + ${h}, ${r});\n`;
                    code += `${indent}${ctx}.lineTo(${x} + ${r}, ${y} + ${h});\n`;
                    code += `${indent}${ctx}.arcTo(${x}, ${y} + ${h}, ${x}, ${y} + ${h} - ${r}, ${r});\n`;
                    code += `${indent}${ctx}.lineTo(${x}, ${y} + ${r});\n`;
                    code += `${indent}${ctx}.arcTo(${x}, ${y}, ${x} + ${r}, ${y}, ${r});\n`;
                    code += `${indent}${ctx}.closePath();\n`;
                    if (params.filled) {
                        code += `${indent}${ctx}.fillStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}${ctx}.fill();`;
                    } else {
                        code += `${indent}${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}${ctx}.stroke();`;
                    }
                    return code;
                }
            },
            {
                type: 'drawStar',
                name: 'Draw Star',
                description: 'Draw a star shape',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0 },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0 },
                    { name: 'points', type: 'number', label: 'Points', default: 5, min: 3 },
                    { name: 'outerRadius', type: 'number', label: 'Outer Radius', default: 50 },
                    { name: 'innerRadius', type: 'number', label: 'Inner Radius', default: 25 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'filled', type: 'boolean', label: 'Filled', default: true }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}{\n`;
                    code += `${indent}    ${ctx}.beginPath();\n`;
                    code += `${indent}    const points = ${params.points || 5};\n`;
                    code += `${indent}    const outerRadius = ${params.outerRadius || 50};\n`;
                    code += `${indent}    const innerRadius = ${params.innerRadius || 25};\n`;
                    code += `${indent}    const cx = ${params.x || 0};\n`;
                    code += `${indent}    const cy = ${params.y || 0};\n`;
                    code += `${indent}    for (let i = 0; i < points * 2; i++) {\n`;
                    code += `${indent}        const radius = i % 2 === 0 ? outerRadius : innerRadius;\n`;
                    code += `${indent}        const angle = (i * Math.PI) / points - Math.PI / 2;\n`;
                    code += `${indent}        const x = cx + Math.cos(angle) * radius;\n`;
                    code += `${indent}        const y = cy + Math.sin(angle) * radius;\n`;
                    code += `${indent}        if (i === 0) ${ctx}.moveTo(x, y);\n`;
                    code += `${indent}        else ${ctx}.lineTo(x, y);\n`;
                    code += `${indent}    }\n`;
                    code += `${indent}    ${ctx}.closePath();\n`;
                    if (params.filled) {
                        code += `${indent}    ${ctx}.fillStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}    ${ctx}.fill();\n`;
                    } else {
                        code += `${indent}    ${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}    ${ctx}.stroke();\n`;
                    }
                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'drawTriangle',
                name: 'Draw Triangle',
                description: 'Draw a triangle',
                category: 'Drawing',
                inputs: [
                    { name: 'x1', type: 'number', label: 'X1', default: 0 },
                    { name: 'y1', type: 'number', label: 'Y1', default: -50 },
                    { name: 'x2', type: 'number', label: 'X2', default: -50 },
                    { name: 'y2', type: 'number', label: 'Y2', default: 50 },
                    { name: 'x3', type: 'number', label: 'X3', default: 50 },
                    { name: 'y3', type: 'number', label: 'Y3', default: 50 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'filled', type: 'boolean', label: 'Filled', default: true }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}${ctx}.beginPath();\n`;
                    code += `${indent}${ctx}.moveTo(${params.x1 || 0}, ${params.y1 || -50});\n`;
                    code += `${indent}${ctx}.lineTo(${params.x2 || -50}, ${params.y2 || 50});\n`;
                    code += `${indent}${ctx}.lineTo(${params.x3 || 50}, ${params.y3 || 50});\n`;
                    code += `${indent}${ctx}.closePath();\n`;
                    if (params.filled) {
                        code += `${indent}${ctx}.fillStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}${ctx}.fill();`;
                    } else {
                        code += `${indent}${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                        code += `${indent}${ctx}.stroke();`;
                    }
                    return code;
                }
            },
            {
                type: 'drawArrow',
                name: 'Draw Arrow',
                description: 'Draw an arrow from one point to another',
                category: 'Drawing',
                inputs: [
                    { name: 'x1', type: 'number', label: 'From X', default: 0 },
                    { name: 'y1', type: 'number', label: 'From Y', default: 0 },
                    { name: 'x2', type: 'number', label: 'To X', default: 100 },
                    { name: 'y2', type: 'number', label: 'To Y', default: 0 },
                    { name: 'headSize', type: 'number', label: 'Arrow Head Size', default: 10 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'lineWidth', type: 'number', label: 'Line Width', default: 2 }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}{\n`;
                    code += `${indent}    const x1 = ${params.x1 || 0};\n`;
                    code += `${indent}    const y1 = ${params.y1 || 0};\n`;
                    code += `${indent}    const x2 = ${params.x2 || 100};\n`;
                    code += `${indent}    const y2 = ${params.y2 || 0};\n`;
                    code += `${indent}    const headSize = ${params.headSize || 10};\n`;
                    code += `${indent}    const angle = Math.atan2(y2 - y1, x2 - x1);\n`;
                    code += `${indent}    ${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                    code += `${indent}    ${ctx}.lineWidth = ${params.lineWidth || 2};\n`;
                    code += `${indent}    ${ctx}.beginPath();\n`;
                    code += `${indent}    ${ctx}.moveTo(x1, y1);\n`;
                    code += `${indent}    ${ctx}.lineTo(x2, y2);\n`;
                    code += `${indent}    ${ctx}.stroke();\n`;
                    code += `${indent}    ${ctx}.beginPath();\n`;
                    code += `${indent}    ${ctx}.moveTo(x2, y2);\n`;
                    code += `${indent}    ${ctx}.lineTo(x2 - headSize * Math.cos(angle - Math.PI / 6), y2 - headSize * Math.sin(angle - Math.PI / 6));\n`;
                    code += `${indent}    ${ctx}.lineTo(x2 - headSize * Math.cos(angle + Math.PI / 6), y2 - headSize * Math.sin(angle + Math.PI / 6));\n`;
                    code += `${indent}    ${ctx}.closePath();\n`;
                    code += `${indent}    ${ctx}.fillStyle = "${params.color || '#ffffff'}";\n`;
                    code += `${indent}    ${ctx}.fill();\n`;
                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'drawBezierCurve',
                name: 'Draw Bezier Curve',
                description: 'Draw a cubic bezier curve',
                category: 'Drawing',
                inputs: [
                    { name: 'x1', type: 'number', label: 'Start X', default: 0 },
                    { name: 'y1', type: 'number', label: 'Start Y', default: 0 },
                    { name: 'cp1x', type: 'number', label: 'Control Point 1 X', default: 50 },
                    { name: 'cp1y', type: 'number', label: 'Control Point 1 Y', default: -50 },
                    { name: 'cp2x', type: 'number', label: 'Control Point 2 X', default: 50 },
                    { name: 'cp2y', type: 'number', label: 'Control Point 2 Y', default: 50 },
                    { name: 'x2', type: 'number', label: 'End X', default: 100 },
                    { name: 'y2', type: 'number', label: 'End Y', default: 0 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'lineWidth', type: 'number', label: 'Line Width', default: 2 }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}${ctx}.beginPath();\n`;
                    code += `${indent}${ctx}.moveTo(${params.x1 || 0}, ${params.y1 || 0});\n`;
                    code += `${indent}${ctx}.bezierCurveTo(${params.cp1x || 50}, ${params.cp1y || -50}, ${params.cp2x || 50}, ${params.cp2y || 50}, ${params.x2 || 100}, ${params.y2 || 0});\n`;
                    code += `${indent}${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                    code += `${indent}${ctx}.lineWidth = ${params.lineWidth || 2};\n`;
                    code += `${indent}${ctx}.stroke();`;
                    return code;
                }
            },
            {
                type: 'drawQuadraticCurve',
                name: 'Draw Quadratic Curve',
                description: 'Draw a quadratic curve',
                category: 'Drawing',
                inputs: [
                    { name: 'x1', type: 'number', label: 'Start X', default: 0 },
                    { name: 'y1', type: 'number', label: 'Start Y', default: 0 },
                    { name: 'cpx', type: 'number', label: 'Control Point X', default: 50 },
                    { name: 'cpy', type: 'number', label: 'Control Point Y', default: -50 },
                    { name: 'x2', type: 'number', label: 'End X', default: 100 },
                    { name: 'y2', type: 'number', label: 'End Y', default: 0 },
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'lineWidth', type: 'number', label: 'Line Width', default: 2 }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}${ctx}.beginPath();\n`;
                    code += `${indent}${ctx}.moveTo(${params.x1 || 0}, ${params.y1 || 0});\n`;
                    code += `${indent}${ctx}.quadraticCurveTo(${params.cpx || 50}, ${params.cpy || -50}, ${params.x2 || 100}, ${params.y2 || 0});\n`;
                    code += `${indent}${ctx}.strokeStyle = "${params.color || '#ffffff'}";\n`;
                    code += `${indent}${ctx}.lineWidth = ${params.lineWidth || 2};\n`;
                    code += `${indent}${ctx}.stroke();`;
                    return code;
                }
            },
            {
                type: 'drawGrid',
                name: 'Draw Grid',
                description: 'Draw a grid pattern',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X Offset', default: 0 },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0 },
                    { name: 'width', type: 'number', label: 'Width', default: 400 },
                    { name: 'height', type: 'number', label: 'Height', default: 400 },
                    { name: 'cellSize', type: 'number', label: 'Cell Size', default: 20 },
                    { name: 'color', type: 'string', label: 'Color', default: '#333333' },
                    { name: 'lineWidth', type: 'number', label: 'Line Width', default: 1 }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const ctx = 'ctx';
                    let code = `${indent}{\n`;
                    code += `${indent}    const startX = ${params.x || 0};\n`;
                    code += `${indent}    const startY = ${params.y || 0};\n`;
                    code += `${indent}    const width = ${params.width || 400};\n`;
                    code += `${indent}    const height = ${params.height || 400};\n`;
                    code += `${indent}    const cellSize = ${params.cellSize || 20};\n`;
                    code += `${indent}    ${ctx}.strokeStyle = "${params.color || '#333333'}";\n`;
                    code += `${indent}    ${ctx}.lineWidth = ${params.lineWidth || 1};\n`;
                    code += `${indent}    ${ctx}.beginPath();\n`;
                    code += `${indent}    for (let x = startX; x <= startX + width; x += cellSize) {\n`;
                    code += `${indent}        ${ctx}.moveTo(x, startY);\n`;
                    code += `${indent}        ${ctx}.lineTo(x, startY + height);\n`;
                    code += `${indent}    }\n`;
                    code += `${indent}    for (let y = startY; y <= startY + height; y += cellSize) {\n`;
                    code += `${indent}        ${ctx}.moveTo(startX, y);\n`;
                    code += `${indent}        ${ctx}.lineTo(startX + width, y);\n`;
                    code += `${indent}    }\n`;
                    code += `${indent}    ${ctx}.stroke();\n`;
                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'setGlobalAlpha',
                name: 'Set Transparency',
                description: 'Set the global transparency for drawing (0-1)',
                category: 'Drawing',
                inputs: [
                    { name: 'alpha', type: 'number', label: 'Alpha', default: 1, min: 0, max: 1, step: 0.1 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}ctx.globalAlpha = ${params.alpha || 1};`
            },
            {
                type: 'setLineDash',
                name: 'Set Line Dash',
                description: 'Set dashed line pattern',
                category: 'Drawing',
                inputs: [
                    { name: 'pattern', type: 'string', label: 'Dash Pattern (e.g., 5,10)', default: '5,5', description: 'Comma-separated dash and gap lengths' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const pattern = params.pattern || '5,5';
                    return `${indent}ctx.setLineDash([${pattern}]);`;
                }
            },
            {
                type: 'setShadow',
                name: 'Set Shadow',
                description: 'Add shadow effect to drawings',
                category: 'Drawing',
                inputs: [
                    { name: 'offsetX', type: 'number', label: 'Offset X', default: 5 },
                    { name: 'offsetY', type: 'number', label: 'Offset Y', default: 5 },
                    { name: 'blur', type: 'number', label: 'Blur', default: 10 },
                    { name: 'color', type: 'string', label: 'Color', default: 'rgba(0,0,0,0.5)' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    let code = `${indent}ctx.shadowOffsetX = ${params.offsetX || 5};\n`;
                    code += `${indent}ctx.shadowOffsetY = ${params.offsetY || 5};\n`;
                    code += `${indent}ctx.shadowBlur = ${params.blur || 10};\n`;
                    code += `${indent}ctx.shadowColor = "${params.color || 'rgba(0,0,0,0.5)'}";`;
                    return code;
                }
            },
            {
                type: 'clearShadow',
                name: 'Clear Shadow',
                description: 'Remove shadow effect',
                category: 'Drawing',
                inputs: [],
                toJavascriptCode: (params, element, indent = '') => {
                    let code = `${indent}ctx.shadowOffsetX = 0;\n`;
                    code += `${indent}ctx.shadowOffsetY = 0;\n`;
                    code += `${indent}ctx.shadowBlur = 0;`;
                    return code;
                }
            },
            {
                type: 'setTextAlign',
                name: 'Set Text Alignment',
                description: 'Set text alignment',
                category: 'Drawing',
                inputs: [
                    { name: 'align', type: 'string', label: 'Horizontal Align', options: ['left', 'center', 'right', 'start', 'end'], default: 'left' },
                    { name: 'baseline', type: 'string', label: 'Vertical Baseline', options: ['top', 'middle', 'bottom', 'alphabetic', 'hanging'], default: 'alphabetic' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    let code = `${indent}ctx.textAlign = "${params.align || 'left'}";\n`;
                    code += `${indent}ctx.textBaseline = "${params.baseline || 'alphabetic'}";`;
                    return code;
                }
            },
            {
                type: 'setCompositeOperation',
                name: 'Set Blend Mode',
                description: 'Set how new shapes are drawn onto existing content',
                category: 'Drawing',
                inputs: [
                    {
                        name: 'operation', type: 'string', label: 'Blend Mode',
                        options: ['source-over', 'source-in', 'source-out', 'source-atop',
                            'destination-over', 'destination-in', 'destination-out', 'destination-atop',
                            'lighter', 'copy', 'xor', 'multiply', 'screen', 'overlay', 'darken', 'lighten'],
                        default: 'source-over'
                    }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}ctx.globalCompositeOperation = "${params.operation || 'source-over'}";`
            },
            {
                type: 'drawImage',
                name: 'Draw Image',
                description: 'Draw an image from asset manager',
                category: 'Drawing',
                inputs: [
                    { name: 'assetName', type: 'string', label: 'Asset Name', description: 'Name of the image asset' },
                    { name: 'x', type: 'number', label: 'X Offset', default: 0 },
                    { name: 'y', type: 'number', label: 'Y Offset', default: 0 },
                    { name: 'width', type: 'number', label: 'Width (0 = original)', default: 0 },
                    { name: 'height', type: 'number', label: 'Height (0 = original)', default: 0 }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    let code = `${indent}{\n`;
                    code += `${indent}    const img = window.assetManager.getAsset("${params.assetName || ''}");\n`;
                    code += `${indent}    if (img && img.complete) {\n`;
                    if ((params.width || 0) > 0 && (params.height || 0) > 0) {
                        const x = (params.x || 0) - (params.width || 0) / 2;
                        const y = (params.y || 0) - (params.height || 0) / 2;
                        code += `${indent}        ctx.drawImage(img, ${x}, ${y}, ${params.width}, ${params.height});\n`;
                    } else {
                        code += `${indent}        ctx.drawImage(img, ${params.x || 0} - img.width / 2, ${params.y || 0} - img.height / 2);\n`;
                    }
                    code += `${indent}    }\n`;
                    code += `${indent}}`;
                    return code;
                }
            },
            {
                type: 'setFillStyle',
                name: 'Set Fill Style',
                description: 'Set the fill color/style for drawing',
                category: 'Drawing',
                inputs: [
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}ctx.fillStyle = "${params.color || '#ffffff'}";`
            },
            {
                type: 'setStrokeStyle',
                name: 'Set Stroke Style',
                description: 'Set the stroke color/style for drawing',
                category: 'Drawing',
                inputs: [
                    { name: 'color', type: 'string', label: 'Color', default: '#ffffff' },
                    { name: 'lineWidth', type: 'number', label: 'Line Width', default: 1 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}ctx.strokeStyle = "${params.color || '#ffffff'}";\n${indent}ctx.lineWidth = ${params.lineWidth || 1};`
            },
            {
                type: 'clearCanvas',
                name: 'Clear Canvas',
                description: 'Clear a rectangular area of the canvas',
                category: 'Drawing',
                inputs: [
                    { name: 'x', type: 'number', label: 'X', default: 0 },
                    { name: 'y', type: 'number', label: 'Y', default: 0 },
                    { name: 'width', type: 'number', label: 'Width', default: 800 },
                    { name: 'height', type: 'number', label: 'Height', default: 600 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}ctx.clearRect(${params.x || 0}, ${params.y || 0}, ${params.width || 800}, ${params.height || 600});`
            },
            // ============================================
            // MELODICODE SCRIPT BUILDING ACTIONS
            // ============================================
            {
                type: 'melodicodeSetBPM',
                name: 'Set BPM',
                description: 'Set the tempo for the MelodiCode script',
                category: 'MelodiCode Script',
                inputs: [
                    { name: 'bpm', type: 'number', label: 'BPM', default: 120 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}script += 'bpm ${params.bpm || 120}\\n';`
            },
            {
                type: 'melodicodeAddTone',
                name: 'Add Tone',
                description: 'Add a tone to the MelodiCode script',
                category: 'MelodiCode Script',
                inputs: [
                    { name: 'note', type: 'string', label: 'Note', default: 'C4', options: ['C0', 'C#0', 'D0', 'D#0', 'E0', 'F0', 'F#0', 'G0', 'G#0', 'A0', 'A#0', 'B0', 'C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1', 'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2', 'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3', 'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5', 'C6', 'C#6', 'D6', 'D#6', 'E6', 'F6', 'F#6', 'G6', 'G#6', 'A6', 'A#6', 'B6', 'C7', 'C#7', 'D7', 'D#7', 'E7', 'F7', 'F#7', 'G7', 'G#7', 'A7', 'A#7', 'B7', 'C8'] },
                    { name: 'duration', type: 'number', label: 'Duration', default: 1 },
                    { name: 'waveType', type: 'string', label: 'Wave Type', default: 'sine', options: ['sine', 'square', 'triangle', 'sawtooth'] },
                    { name: 'volume', type: 'number', label: 'Volume', default: 0.8 },
                    { name: 'pan', type: 'number', label: 'Pan', default: 0 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}script += 'tone ${params.note || 'C4'} ${params.duration || 1} ${params.waveType || 'sine'} ${params.volume || 0.8} ${params.pan || 0}\\n';`
            },
            {
                type: 'melodicodeAddSample',
                name: 'Add Sample',
                description: 'Add a drum/sample sound to the script',
                category: 'MelodiCode Script',
                inputs: [
                    { name: 'sample', type: 'string', label: 'Sample', default: 'kick', options: ['kick', 'snare', 'hihat', 'hihat_open', 'crash', 'ride', 'tom_high', 'tom_mid', 'tom_low', 'clap', 'triangle', 'bass_low', 'bass_mid', 'bass_high', 'sub_bass', 'bass_pluck', 'lead_1', 'lead_2', 'lead_bright', 'lead_soft', 'pad_1', 'pad_warm', 'pad_strings', 'pad_choir', 'shaker', 'tambourine', 'cowbell', 'woodblock', 'whoosh', 'zap', 'drop', 'rise'] },
                    { name: 'pitch', type: 'number', label: 'Pitch', default: 1 },
                    { name: 'timescale', type: 'number', label: 'Timescale', default: 1 },
                    { name: 'volume', type: 'number', label: 'Volume', default: 0.8 },
                    { name: 'pan', type: 'number', label: 'Pan', default: 0 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}script += 'sample ${params.sample || 'kick'} ${params.pitch || 1} ${params.timescale || 1} ${params.volume || 0.8} ${params.pan || 0}\\n';`
            },
            {
                type: 'melodicodeAddSlide',
                name: 'Add Slide',
                description: 'Add a frequency slide between two notes',
                category: 'MelodiCode Script',
                inputs: [
                    { name: 'startNote', type: 'string', label: 'Start Note', default: 'C4' },
                    { name: 'endNote', type: 'string', label: 'End Note', default: 'C5' },
                    { name: 'duration', type: 'number', label: 'Duration', default: 1 },
                    { name: 'waveType', type: 'string', label: 'Wave Type', default: 'sine', options: ['sine', 'square', 'triangle', 'sawtooth'] },
                    { name: 'volume', type: 'number', label: 'Volume', default: 0.8 },
                    { name: 'pan', type: 'number', label: 'Pan', default: 0 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}script += 'slide ${params.startNote || 'C4'} ${params.endNote || 'C5'} ${params.duration || 1} ${params.waveType || 'sine'} ${params.volume || 0.8} ${params.pan || 0}\\n';`
            },
            {
                type: 'melodicodeAddWait',
                name: 'Add Wait',
                description: 'Add a pause/wait in the script',
                category: 'MelodiCode Script',
                inputs: [
                    { name: 'duration', type: 'number', label: 'Duration', default: 1 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}script += 'wait ${params.duration || 1}\\n';`
            },
            {
                type: 'melodicodeStartBlock',
                name: 'Start Block',
                description: 'Start a named block in the script',
                category: 'MelodiCode Script',
                inputs: [
                    { name: 'blockName', type: 'string', label: 'Block Name', default: 'main' },
                    { name: 'effects', type: 'string', label: 'Effects (optional)', default: '' }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const effects = params.effects ? ` ${params.effects}` : '';
                    return `${indent}script += '[${params.blockName || 'main'}]${effects}\\n';`;
                }
            },
            {
                type: 'melodicodeEndBlock',
                name: 'End Block',
                description: 'End the current block',
                category: 'MelodiCode Script',
                inputs: [],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}script += '[end]\\n';`
            },
            {
                type: 'melodicodeAddPlay',
                name: 'Add Play Command',
                description: 'Add a play command to play blocks',
                category: 'MelodiCode Script',
                inputs: [
                    { name: 'blocks', type: 'string', label: 'Block Names (space-separated)', default: 'main' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}script += 'play ${params.blocks || 'main'}\\n';`
            },
            {
                type: 'melodicodeAddLoop',
                name: 'Add Loop Command',
                description: 'Add a loop command to repeat blocks',
                category: 'MelodiCode Script',
                inputs: [
                    { name: 'count', type: 'number', label: 'Loop Count', default: 4 },
                    { name: 'blocks', type: 'string', label: 'Block Names (space-separated)', default: 'main' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}script += 'loop ${params.count || 4} ${params.blocks || 'main'}\\n';`
            },
            // ============================================
            // MELODICODE PLAYBACK ACTIONS
            // ============================================
            {
                type: 'playMelodiCode',
                name: 'Play MelodiCode',
                description: 'Play a MelodiCode script (call a melodicode event)',
                category: 'MelodiCode',
                inputs: [
                    { name: 'methodName', type: 'string', label: 'MelodiCode Method Name', default: 'buildMelodiCodeScript' },
                    { name: 'bpm', type: 'number', label: 'BPM (optional, overrides script)', default: 0 }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const methodName = params.methodName || 'buildMelodiCodeScript';
                    if (params.bpm && params.bpm > 0) {
                        return `${indent}window.melodicode.play(this.${methodName}(), ${params.bpm});`;
                    }
                    return `${indent}window.melodicode.play(this.${methodName}());`;
                }
            },
            {
                type: 'stopMelodiCode',
                name: 'Stop MelodiCode',
                description: 'Stop the currently playing MelodiCode',
                category: 'MelodiCode',
                inputs: [],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}window.melodicode.stop();`
            },
            {
                type: 'isMelodiCodePlaying',
                name: 'Is MelodiCode Playing',
                description: 'Check if MelodiCode is currently playing',
                category: 'MelodiCode',
                inputs: [
                    { name: 'variable', type: 'string', label: 'Store in Variable', default: 'isPlaying' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.variable || 'isPlaying'} = window.melodicode.getIsPlaying();`
            },
            {
                type: 'setMelodiCodeVolume',
                name: 'Set MelodiCode Volume',
                description: 'Set the master volume for MelodiCode',
                category: 'MelodiCode',
                inputs: [
                    { name: 'volume', type: 'number', label: 'Volume (0-1)', default: 1 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}window.melodicode.setMasterVolume(${params.volume || 1});`
            },
            // ============================================
            // MELODICODE ACTIONS
            // ============================================
            {
                type: 'melodicodePlay',
                name: 'Play MelodiCode',
                description: 'Play a MelodiCode script',
                category: 'MelodiCode',
                inputs: [
                    { name: 'code', type: 'string', label: 'MelodiCode Script', default: 'bpm 120\ntone C4 1 sine' },
                    { name: 'bpm', type: 'number', label: 'BPM', default: 120 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}window.melodicode.play(\`${params.code || ''}\`, ${params.bpm || 120});`
            },
            {
                type: 'melodicodeStop',
                name: 'Stop MelodiCode',
                description: 'Stop the currently playing MelodiCode',
                category: 'MelodiCode',
                inputs: [],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}window.melodicode.stop();`
            },
            {
                type: 'melodicodePlayTone',
                name: 'Play Tone',
                description: 'Play a single tone',
                category: 'MelodiCode',
                inputs: [
                    { name: 'note', type: 'string', label: 'Note', default: 'C4', options: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'] },
                    { name: 'duration', type: 'number', label: 'Duration', default: 1 },
                    { name: 'waveType', type: 'string', label: 'Wave Type', default: 'sine', options: ['sine', 'square', 'triangle', 'sawtooth'] },
                    { name: 'volume', type: 'number', label: 'Volume', default: 0.8 },
                    { name: 'pan', type: 'number', label: 'Pan', default: 0 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}window.melodicode.playTone('${params.note || 'C4'}', ${params.duration || 1}, '${params.waveType || 'sine'}', { volume: ${params.volume || 0.8}, pan: ${params.pan || 0} });`
            },
            {
                type: 'melodicodePlaySample',
                name: 'Play Sample',
                description: 'Play a drum/sample sound',
                category: 'MelodiCode',
                inputs: [
                    { name: 'sample', type: 'string', label: 'Sample', default: 'kick', options: ['kick', 'snare', 'hihat', 'crash'] },
                    { name: 'pitch', type: 'number', label: 'Pitch', default: 1 },
                    { name: 'volume', type: 'number', label: 'Volume', default: 0.8 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}window.melodicode.playSample('${params.sample || 'kick'}', { pitch: ${params.pitch || 1}, volume: ${params.volume || 0.8} });`
            },
            {
                type: 'melodicodeSetVolume',
                name: 'Set Master Volume',
                description: 'Set the master volume for MelodiCode',
                category: 'MelodiCode',
                inputs: [
                    { name: 'volume', type: 'number', label: 'Volume (0-1)', default: 1 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}window.melodicode.setMasterVolume(${params.volume || 1});`
            },

            // ============================================
            // INPUT ACTIONS
            // ============================================
            {
                type: 'enableInput',
                name: 'Enable Input',
                description: 'Enable input handling',
                category: 'Input',
                inputs: [],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}window.input.enable();`
            },
            {
                type: 'disableInput',
                name: 'Disable Input',
                description: 'Disable input handling',
                category: 'Input',
                inputs: [],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}window.input.disable();`
            },

            // ============================================
            // MATH ACTIONS
            // ============================================
            {
                type: 'setVariableToMath',
                name: 'Math Operation',
                description: 'Perform a math operation and store the result',
                category: 'Math',
                inputs: [
                    { name: 'variable', type: 'string', label: 'Variable', default: 'result' },
                    { name: 'operation', type: 'string', label: 'Operation', default: 'add', options: ['add', 'subtract', 'multiply', 'divide', 'modulo', 'pow', 'sin', 'cos', 'tan', 'sqrt', 'abs', 'floor', 'ceil', 'round', 'min', 'max', 'random'] },
                    { name: 'a', type: 'number', label: 'Value A', default: 0 },
                    { name: 'b', type: 'number', label: 'Value B', default: 0 }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    const op = params.operation || 'add';
                    const a = params.a || 0;
                    const b = params.b || 0;
                    const variable = params.variable || 'result';

                    let expr;
                    switch (op) {
                        case 'add': expr = `${a} + ${b}`; break;
                        case 'subtract': expr = `${a} - ${b}`; break;
                        case 'multiply': expr = `${a} * ${b}`; break;
                        case 'divide': expr = `${a} / ${b}`; break;
                        case 'modulo': expr = `${a} % ${b}`; break;
                        case 'pow': expr = `Math.pow(${a}, ${b})`; break;
                        case 'sin': expr = `Math.sin(${a})`; break;
                        case 'cos': expr = `Math.cos(${a})`; break;
                        case 'tan': expr = `Math.tan(${a})`; break;
                        case 'sqrt': expr = `Math.sqrt(${a})`; break;
                        case 'abs': expr = `Math.abs(${a})`; break;
                        case 'floor': expr = `Math.floor(${a})`; break;
                        case 'ceil': expr = `Math.ceil(${a})`; break;
                        case 'round': expr = `Math.round(${a})`; break;
                        case 'min': expr = `Math.min(${a}, ${b})`; break;
                        case 'max': expr = `Math.max(${a}, ${b})`; break;
                        case 'random': expr = `Math.random() * (${b} - ${a}) + ${a}`; break;
                        default: expr = `${a}`;
                    }

                    return `${indent}${variable} = ${expr};`;
                }
            },
            {
                type: 'lerp',
                name: 'Lerp',
                description: 'Linear interpolation between two values',
                category: 'Math',
                inputs: [
                    { name: 'variable', type: 'string', label: 'Variable', default: 'result' },
                    { name: 'from', type: 'number', label: 'From', default: 0 },
                    { name: 'to', type: 'number', label: 'To', default: 100 },
                    { name: 'amount', type: 'number', label: 'Amount (0-1)', default: 0.5 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.variable || 'result'} = ${params.from || 0} + (${params.to || 100} - ${params.from || 0}) * ${params.amount || 0.5};`
            },
            {
                type: 'clamp',
                name: 'Clamp',
                description: 'Clamp a value between min and max',
                category: 'Math',
                inputs: [
                    { name: 'variable', type: 'string', label: 'Variable', default: 'result' },
                    { name: 'value', type: 'number', label: 'Value', default: 50 },
                    { name: 'min', type: 'number', label: 'Min', default: 0 },
                    { name: 'max', type: 'number', label: 'Max', default: 100 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.variable || 'result'} = Math.min(Math.max(${params.value || 50}, ${params.min || 0}), ${params.max || 100});`
            },

            // ============================================
            // STRING ACTIONS
            // ============================================
            {
                type: 'stringConcat',
                name: 'Concatenate Strings',
                description: 'Combine two strings',
                category: 'String',
                inputs: [
                    { name: 'variable', type: 'string', label: 'Variable', default: 'result' },
                    { name: 'a', type: 'string', label: 'String A', default: 'Hello' },
                    { name: 'b', type: 'string', label: 'String B', default: ' World' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.variable || 'result'} = "${params.a || ''}" + "${params.b || ''}";`
            },
            {
                type: 'stringToUpper',
                name: 'To Uppercase',
                description: 'Convert string to uppercase',
                category: 'String',
                inputs: [
                    { name: 'variable', type: 'string', label: 'Variable', default: 'result' },
                    { name: 'string', type: 'string', label: 'String', default: 'hello' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.variable || 'result'} = "${params.string || ''}".toUpperCase();`
            },
            {
                type: 'stringToLower',
                name: 'To Lowercase',
                description: 'Convert string to lowercase',
                category: 'String',
                inputs: [
                    { name: 'variable', type: 'string', label: 'Variable', default: 'result' },
                    { name: 'string', type: 'string', label: 'String', default: 'HELLO' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.variable || 'result'} = "${params.string || ''}".toLowerCase();`
            },
            {
                type: 'stringLength',
                name: 'String Length',
                description: 'Get the length of a string',
                category: 'String',
                inputs: [
                    { name: 'variable', type: 'string', label: 'Variable', default: 'length' },
                    { name: 'string', type: 'string', label: 'String', default: 'hello' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.variable || 'length'} = "${params.string || ''}".length;`
            },

            // ============================================
            // ARRAY ACTIONS
            // ============================================
            {
                type: 'createArray',
                name: 'Create Array',
                description: 'Create an empty array',
                category: 'Array',
                inputs: [
                    { name: 'variable', type: 'string', label: 'Variable Name', default: 'myArray' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.variable || 'myArray'} = [];`
            },
            {
                type: 'arrayPush',
                name: 'Array Push',
                description: 'Add an element to the end of an array',
                category: 'Array',
                inputs: [
                    { name: 'array', type: 'string', label: 'Array', default: 'myArray' },
                    { name: 'value', type: 'string', label: 'Value', default: '0' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.array || 'myArray'}.push(${params.value || '0'});`
            },
            {
                type: 'arrayPop',
                name: 'Array Pop',
                description: 'Remove and return the last element',
                category: 'Array',
                inputs: [
                    { name: 'array', type: 'string', label: 'Array', default: 'myArray' },
                    { name: 'variable', type: 'string', label: 'Store in Variable', default: 'value' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.variable || 'value'} = ${params.array || 'myArray'}.pop();`
            },
            {
                type: 'arrayGet',
                name: 'Array Get',
                description: 'Get an element from an array by index',
                category: 'Array',
                inputs: [
                    { name: 'array', type: 'string', label: 'Array', default: 'myArray' },
                    { name: 'index', type: 'number', label: 'Index', default: 0 },
                    { name: 'variable', type: 'string', label: 'Store in Variable', default: 'value' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.variable || 'value'} = ${params.array || 'myArray'}[${params.index || 0}];`
            },
            {
                type: 'arraySet',
                name: 'Array Set',
                description: 'Set an element in an array by index',
                category: 'Array',
                inputs: [
                    { name: 'array', type: 'string', label: 'Array', default: 'myArray' },
                    { name: 'index', type: 'number', label: 'Index', default: 0 },
                    { name: 'value', type: 'string', label: 'Value', default: '0' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.array || 'myArray'}[${params.index || 0}] = ${params.value || '0'};`
            },
            {
                type: 'arrayLength',
                name: 'Array Length',
                description: 'Get the length of an array',
                category: 'Array',
                inputs: [
                    { name: 'array', type: 'string', label: 'Array', default: 'myArray' },
                    { name: 'variable', type: 'string', label: 'Store in Variable', default: 'length' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.variable || 'length'} = ${params.array || 'myArray'}.length;`
            },

            // ============================================
            // TIME ACTIONS
            // ============================================
            {
                type: 'setTimeScale',
                name: 'Set Time Scale',
                description: 'Set the game time scale (1 = normal, 0.5 = slow motion, 2 = fast forward)',
                category: 'Time',
                inputs: [
                    { name: 'timeScale', type: 'number', label: 'Time Scale', default: 1 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}window.engine.timeScale = ${params.timeScale || 1};`
            },
            {
                type: 'pauseGame',
                name: 'Pause Game',
                description: 'Pause the game',
                category: 'Time',
                inputs: [],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}window.engine.paused = true;`
            },
            {
                type: 'resumeGame',
                name: 'Resume Game',
                description: 'Resume the game',
                category: 'Time',
                inputs: [],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}window.engine.paused = false;`
            },

            // ============================================
            // RANDOM ACTIONS  
            // ============================================
            {
                type: 'randomRange',
                name: 'Random Range',
                description: 'Generate a random number between min and max',
                category: 'Random',
                inputs: [
                    { name: 'variable', type: 'string', label: 'Variable', default: 'random' },
                    { name: 'min', type: 'number', label: 'Min', default: 0 },
                    { name: 'max', type: 'number', label: 'Max', default: 100 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.variable || 'random'} = Math.random() * (${params.max || 100} - ${params.min || 0}) + ${params.min || 0};`
            },
            {
                type: 'randomInt',
                name: 'Random Integer',
                description: 'Generate a random integer between min and max',
                category: 'Random',
                inputs: [
                    { name: 'variable', type: 'string', label: 'Variable', default: 'random' },
                    { name: 'min', type: 'number', label: 'Min', default: 0 },
                    { name: 'max', type: 'number', label: 'Max', default: 10 }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.variable || 'random'} = Math.floor(Math.random() * (${params.max || 10} - ${params.min || 0} + 1)) + ${params.min || 0};`
            },
            {
                type: 'randomName',
                name: 'Random Name',
                description: 'Generate a random name from the name generator',
                category: 'Random',
                inputs: [
                    { name: 'variable', type: 'string', label: 'Variable', default: 'name' },
                    { name: 'category', type: 'string', label: 'Category', default: 'random', options: ['random', 'medieval', 'fantasy_elf', 'cyberpunk', 'pirate', 'robot', 'superhero'] }
                ],
                toJavascriptCode: (params, element, indent = '') => {
                    if (params.category === 'random') {
                        return `${indent}${params.variable || 'name'} = window.nameGen.generateRandomCrazy();`;
                    }
                    return `${indent}${params.variable || 'name'} = window.nameGen.generate('${params.category || 'random'}');`;
                }
            },

            // ============================================
            // CONSOLE/DEBUG ACTIONS
            // ============================================
            {
                type: 'consoleLog',
                name: 'Console Log',
                description: 'Log a message to the browser console',
                category: 'Debug',
                inputs: [
                    { name: 'message', type: 'string', label: 'Message', default: 'Hello' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}console.log("${params.message || ''}");`
            },
            {
                type: 'consoleWarn',
                name: 'Console Warn',
                description: 'Log a warning to the browser console',
                category: 'Debug',
                inputs: [
                    { name: 'message', type: 'string', label: 'Message', default: 'Warning' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}console.warn("${params.message || ''}");`
            },
            {
                type: 'consoleError',
                name: 'Console Error',
                description: 'Log an error to the browser console',
                category: 'Debug',
                inputs: [
                    { name: 'message', type: 'string', label: 'Message', default: 'Error' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}console.error("${params.message || ''}");`
            },
            {
                type: 'log',
                name: 'Log',
                description: 'Log a message to console',
                category: 'Debug',
                inputs: [
                    { name: 'message', type: 'string', label: 'Message' }
                ],
                toJavascriptCode: (params, element, indent = '') => `${indent}console.log("${params.message || ''}");`
            },
            {
                type: 'customAction',
                name: 'Custom Code',
                description: 'Write custom JavaScript',
                category: 'Advanced',
                inputs: [
                    { name: 'code', type: 'string', label: 'Code' }
                ],
                toJavascriptCode: (params, element, indent = '') => `${indent}${params.code || '// Custom code'}`
            }
        ];
    }

    /**
     * Create a small canvas preview of a drawing action
     */
    createDrawingPreview(element, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);

        // Set up centered coordinate system
        ctx.save();
        ctx.translate(width / 2, height / 2);

        try {
            this.renderDrawingAction(element, ctx, width, height, 0.8);
        } catch (e) {
            console.error('Error rendering drawing preview:', e);
        }

        ctx.restore();
        return canvas;
    }

    /**
     * Render a drawing action to a canvas context
     */
    renderDrawingAction(element, ctx, canvasWidth, canvasHeight, scaleFactor = 1) {
        const params = element.params || {};

        // Apply scale factor to fit in preview
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor);

        switch (element.type) {
            case 'drawRectangle':
            case 'drawGradientRectangle':
            case 'drawRoundedRectangle': {
                const x = (params.x || 0) - (params.width || 100) / 2;
                const y = (params.y || 0) - (params.height || 100) / 2;
                const w = params.width || 100;
                const h = params.height || 100;

                // Scale down to fit
                const scale = Math.min((canvasWidth * 0.8) / w, (canvasHeight * 0.8) / h);
                const scaledX = x * scale;
                const scaledY = y * scale;
                const scaledW = w * scale;
                const scaledH = h * scale;

                if (element.type === 'drawGradientRectangle') {
                    const gradient = ctx.createLinearGradient(scaledX, scaledY, scaledX + scaledW, scaledY + scaledH);
                    gradient.addColorStop(0, params.color1 || '#ffffff');
                    gradient.addColorStop(1, params.color2 || '#000000');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(scaledX, scaledY, scaledW, scaledH);
                } else if (element.type === 'drawRoundedRectangle') {
                    const radius = (params.radius || 10) * scale;
                    ctx.beginPath();
                    ctx.roundRect(scaledX, scaledY, scaledW, scaledH, radius);
                    if (params.filled !== false) {
                        ctx.fillStyle = params.color || '#ffffff';
                        ctx.fill();
                    } else {
                        ctx.strokeStyle = params.color || '#ffffff';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                } else {
                    if (params.filled !== false) {
                        ctx.fillStyle = params.color || '#ffffff';
                        ctx.fillRect(scaledX, scaledY, scaledW, scaledH);
                    } else {
                        ctx.strokeStyle = params.color || '#ffffff';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(scaledX, scaledY, scaledW, scaledH);
                    }
                }
                break;
            }

            case 'drawCircle':
            case 'drawGradientCircle': {
                const radius = params.radius || 50;
                const scale = Math.min((canvasWidth * 0.4) / radius, (canvasHeight * 0.4) / radius);
                const scaledX = (params.x || 0) * scale;
                const scaledY = (params.y || 0) * scale;
                const scaledRadius = radius * scale;

                ctx.beginPath();
                ctx.arc(scaledX, scaledY, scaledRadius, 0, Math.PI * 2);

                if (element.type === 'drawGradientCircle') {
                    const gradient = ctx.createRadialGradient(scaledX, scaledY, 0, scaledX, scaledY, scaledRadius);
                    gradient.addColorStop(0, params.color1 || '#ffffff');
                    gradient.addColorStop(1, params.color2 || '#000000');
                    ctx.fillStyle = gradient;
                    ctx.fill();
                } else {
                    if (params.filled !== false) {
                        ctx.fillStyle = params.color || '#ffffff';
                        ctx.fill();
                    } else {
                        ctx.strokeStyle = params.color || '#ffffff';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
                break;
            }

            case 'drawEllipse': {
                const radiusX = params.radiusX || 75;
                const radiusY = params.radiusY || 50;
                const maxRadius = Math.max(radiusX, radiusY);
                const scale = Math.min((canvasWidth * 0.4) / maxRadius, (canvasHeight * 0.4) / maxRadius);

                ctx.beginPath();
                ctx.ellipse((params.x || 0) * scale, (params.y || 0) * scale,
                    radiusX * scale, radiusY * scale, 0, 0, Math.PI * 2);

                if (params.filled !== false) {
                    ctx.fillStyle = params.color || '#ffffff';
                    ctx.fill();
                } else {
                    ctx.strokeStyle = params.color || '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                break;
            }

            case 'drawLine': {
                const x1 = params.x1 || 0;
                const y1 = params.y1 || 0;
                const x2 = params.x2 || 100;
                const y2 = params.y2 || 100;
                const maxDist = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
                const scale = (Math.min(canvasWidth, canvasHeight) * 0.8) / maxDist;

                ctx.beginPath();
                ctx.moveTo(x1 * scale, y1 * scale);
                ctx.lineTo(x2 * scale, y2 * scale);
                ctx.strokeStyle = params.color || '#ffffff';
                ctx.lineWidth = (params.lineWidth || 1) * scale;
                ctx.stroke();
                break;
            }

            case 'drawDot': {
                const scale = Math.min(canvasWidth, canvasHeight) / 32;
                ctx.beginPath();
                ctx.arc((params.x || 0) * scale, (params.y || 0) * scale, (params.radius || 3) * scale, 0, Math.PI * 2);
                ctx.fillStyle = params.color || '#ffffff';
                ctx.fill();
                break;
            }

            case 'drawCrosshair': {
                const size = params.size || 10;
                const scale = Math.min(canvasWidth, canvasHeight) / (size * 3);
                const scaledX = (params.x || 0) * scale;
                const scaledY = (params.y || 0) * scale;
                const scaledSize = size * scale;

                ctx.beginPath();
                ctx.moveTo(scaledX - scaledSize, scaledY);
                ctx.lineTo(scaledX + scaledSize, scaledY);
                ctx.moveTo(scaledX, scaledY - scaledSize);
                ctx.lineTo(scaledX, scaledY + scaledSize);
                ctx.strokeStyle = params.color || '#ffffff';
                ctx.lineWidth = (params.lineWidth || 1) * scale;
                ctx.stroke();
                break;
            }

            case 'drawHexagon':
            case 'drawRegularPolygon': {
                const radius = params.radius || (element.type === 'drawHexagon' ? 30 : 50);
                const sides = element.type === 'drawHexagon' ? 6 : (params.sides || 5);
                const scale = Math.min(canvasWidth * 0.4, canvasHeight * 0.4) / radius;
                const scaledX = (params.x || 0) * scale;
                const scaledY = (params.y || 0) * scale;
                const scaledRadius = radius * scale;

                ctx.beginPath();
                for (let i = 0; i <= sides; i++) {
                    const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
                    const x = scaledX + scaledRadius * Math.cos(angle);
                    const y = scaledY + scaledRadius * Math.sin(angle);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }

                if (params.filled !== false) {
                    ctx.fillStyle = params.color || '#ffffff';
                    ctx.fill();
                } else {
                    ctx.strokeStyle = params.color || '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                break;
            }

            case 'drawSpiral': {
                const startRadius = params.startRadius || 5;
                const endRadius = params.endRadius || params.maxRadius || 50;
                const scale = Math.min(canvasWidth * 0.4, canvasHeight * 0.4) / endRadius;
                const scaledX = (params.x || 0) * scale;
                const scaledY = (params.y || 0) * scale;
                const rotations = params.rotations || params.turns || 3;
                const segments = params.segments || 100;

                ctx.beginPath();
                for (let i = 0; i <= segments; i++) {
                    const t = i / segments;
                    const angle = t * rotations * Math.PI * 2;
                    const r = (startRadius + (endRadius - startRadius) * t) * scale;
                    const x = scaledX + r * Math.cos(angle);
                    const y = scaledY + r * Math.sin(angle);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = params.color || '#ffffff';
                ctx.lineWidth = params.lineWidth || 2;
                ctx.stroke();
                break;
            }

            case 'drawRing': {
                const outerRadius = params.outerRadius || 50;
                const innerRadius = params.innerRadius || 30;
                const scale = Math.min(canvasWidth * 0.4, canvasHeight * 0.4) / outerRadius;
                const scaledX = (params.x || 0) * scale;
                const scaledY = (params.y || 0) * scale;

                ctx.beginPath();
                ctx.arc(scaledX, scaledY, outerRadius * scale, 0, Math.PI * 2);
                ctx.arc(scaledX, scaledY, innerRadius * scale, 0, Math.PI * 2, true);
                ctx.fillStyle = params.color || '#ffffff';
                ctx.fill();
                break;
            }

            case 'drawArc': {
                const radius = params.radius || 50;
                const scale = Math.min(canvasWidth * 0.4, canvasHeight * 0.4) / radius;
                const scaledX = (params.x || 0) * scale;
                const scaledY = (params.y || 0) * scale;
                const startAngle = (params.startAngle || 0) * Math.PI / 180;
                const endAngle = (params.endAngle || 90) * Math.PI / 180;

                ctx.beginPath();
                ctx.arc(scaledX, scaledY, radius * scale, startAngle, endAngle);

                if (params.filled) {
                    ctx.lineTo(scaledX, scaledY);
                    ctx.closePath();
                    ctx.fillStyle = params.color || '#ffffff';
                    ctx.fill();
                } else {
                    ctx.strokeStyle = params.color || '#ffffff';
                    ctx.lineWidth = (params.lineWidth || 1) * scale;
                    ctx.stroke();
                }
                break;
            }

            case 'drawText': {
                const fontSize = params.fontSize || 16;
                const scale = Math.min(canvasWidth, canvasHeight) / 100;
                ctx.font = `${fontSize * scale}px ${params.font || 'Arial'}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                if (params.filled !== false) {
                    ctx.fillStyle = params.color || '#ffffff';
                    ctx.fillText(params.text || 'Text', (params.x || 0) * scale, (params.y || 0) * scale);
                } else {
                    ctx.strokeStyle = params.color || '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.strokeText(params.text || 'Text', (params.x || 0) * scale, (params.y || 0) * scale);
                }
                break;
            }

            case 'drawPolygon': {
                const points = params.points || '0,0 50,0 25,50';
                const pointsArray = points.split(' ').map(p => p.split(',').map(Number));

                if (pointsArray.length > 0) {
                    // Find bounds
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    pointsArray.forEach(([x, y]) => {
                        minX = Math.min(minX, x);
                        maxX = Math.max(maxX, x);
                        minY = Math.min(minY, y);
                        maxY = Math.max(maxY, y);
                    });

                    const width = maxX - minX || 1;
                    const height = maxY - minY || 1;
                    const scale = Math.min((canvasWidth * 0.8) / width, (canvasHeight * 0.8) / height);
                    const centerX = (minX + maxX) / 2;
                    const centerY = (minY + maxY) / 2;

                    ctx.beginPath();
                    pointsArray.forEach(([x, y], i) => {
                        const scaledX = (x - centerX) * scale;
                        const scaledY = (y - centerY) * scale;
                        if (i === 0) ctx.moveTo(scaledX, scaledY);
                        else ctx.lineTo(scaledX, scaledY);
                    });
                    ctx.closePath();

                    if (params.filled !== false) {
                        ctx.fillStyle = params.color || '#ffffff';
                        ctx.fill();
                    } else {
                        ctx.strokeStyle = params.color || '#ffffff';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
                break;
            }

            case 'drawStar': {
                const points = params.points || 5;
                const outerRadius = params.outerRadius || 50;
                const innerRadius = params.innerRadius || 25;
                const scale = Math.min(canvasWidth * 0.4, canvasHeight * 0.4) / outerRadius;
                const scaledX = (params.x || 0) * scale;
                const scaledY = (params.y || 0) * scale;

                ctx.beginPath();
                for (let i = 0; i < points * 2; i++) {
                    const radius = (i % 2 === 0 ? outerRadius : innerRadius) * scale;
                    const angle = (i * Math.PI) / points - Math.PI / 2;
                    const x = scaledX + Math.cos(angle) * radius;
                    const y = scaledY + Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();

                if (params.filled !== false) {
                    ctx.fillStyle = params.color || '#ffffff';
                    ctx.fill();
                } else {
                    ctx.strokeStyle = params.color || '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                break;
            }

            case 'drawTriangle': {
                const x1 = params.x1 || 0;
                const y1 = params.y1 || -50;
                const x2 = params.x2 || -50;
                const y2 = params.y2 || 50;
                const x3 = params.x3 || 50;
                const y3 = params.y3 || 50;

                // Find bounds
                const minX = Math.min(x1, x2, x3);
                const maxX = Math.max(x1, x2, x3);
                const minY = Math.min(y1, y2, y3);
                const maxY = Math.max(y1, y2, y3);
                const width = maxX - minX || 1;
                const height = maxY - minY || 1;
                const scale = Math.min((canvasWidth * 0.8) / width, (canvasHeight * 0.8) / height);

                ctx.beginPath();
                ctx.moveTo(x1 * scale, y1 * scale);
                ctx.lineTo(x2 * scale, y2 * scale);
                ctx.lineTo(x3 * scale, y3 * scale);
                ctx.closePath();

                if (params.filled !== false) {
                    ctx.fillStyle = params.color || '#ffffff';
                    ctx.fill();
                } else {
                    ctx.strokeStyle = params.color || '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                break;
            }

            case 'drawArrow': {
                const x1 = params.x1 || 0;
                const y1 = params.y1 || 0;
                const x2 = params.x2 || 100;
                const y2 = params.y2 || 0;
                const headSize = params.headSize || 10;

                const maxDist = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 100);
                const scale = (Math.min(canvasWidth, canvasHeight) * 0.8) / maxDist;
                const angle = Math.atan2(y2 - y1, x2 - x1);

                ctx.strokeStyle = params.color || '#ffffff';
                ctx.fillStyle = params.color || '#ffffff';
                ctx.lineWidth = (params.lineWidth || 2) * scale;

                // Draw line
                ctx.beginPath();
                ctx.moveTo(x1 * scale, y1 * scale);
                ctx.lineTo(x2 * scale, y2 * scale);
                ctx.stroke();

                // Draw arrowhead
                ctx.beginPath();
                ctx.moveTo(x2 * scale, y2 * scale);
                ctx.lineTo((x2 - headSize * Math.cos(angle - Math.PI / 6)) * scale,
                    (y2 - headSize * Math.sin(angle - Math.PI / 6)) * scale);
                ctx.lineTo((x2 - headSize * Math.cos(angle + Math.PI / 6)) * scale,
                    (y2 - headSize * Math.sin(angle + Math.PI / 6)) * scale);
                ctx.closePath();
                ctx.fill();
                break;
            }

            case 'drawBezierCurve': {
                const x1 = params.x1 || 0;
                const y1 = params.y1 || 0;
                const x2 = params.x2 || 100;
                const y2 = params.y2 || 0;
                const cp1x = params.cp1x || 50;
                const cp1y = params.cp1y || -50;
                const cp2x = params.cp2x || 50;
                const cp2y = params.cp2y || 50;

                const maxX = Math.max(Math.abs(x1), Math.abs(x2), Math.abs(cp1x), Math.abs(cp2x));
                const maxY = Math.max(Math.abs(y1), Math.abs(y2), Math.abs(cp1y), Math.abs(cp2y));
                const scale = Math.min(canvasWidth * 0.4, canvasHeight * 0.4) / Math.max(maxX, maxY, 1);

                ctx.beginPath();
                ctx.moveTo(x1 * scale, y1 * scale);
                ctx.bezierCurveTo(cp1x * scale, cp1y * scale, cp2x * scale, cp2y * scale, x2 * scale, y2 * scale);
                ctx.strokeStyle = params.color || '#ffffff';
                ctx.lineWidth = (params.lineWidth || 2) * scale;
                ctx.stroke();
                break;
            }

            case 'drawQuadraticCurve': {
                const x1 = params.x1 || 0;
                const y1 = params.y1 || 0;
                const x2 = params.x2 || 100;
                const y2 = params.y2 || 0;
                const cpx = params.cpx || 50;
                const cpy = params.cpy || -50;

                const maxX = Math.max(Math.abs(x1), Math.abs(x2), Math.abs(cpx));
                const maxY = Math.max(Math.abs(y1), Math.abs(y2), Math.abs(cpy));
                const scale = Math.min(canvasWidth * 0.4, canvasHeight * 0.4) / Math.max(maxX, maxY, 1);

                ctx.beginPath();
                ctx.moveTo(x1 * scale, y1 * scale);
                ctx.quadraticCurveTo(cpx * scale, cpy * scale, x2 * scale, y2 * scale);
                ctx.strokeStyle = params.color || '#ffffff';
                ctx.lineWidth = (params.lineWidth || 2) * scale;
                ctx.stroke();
                break;
            }

            case 'drawGrid': {
                const width = params.width || 400;
                const height = params.height || 400;
                const cellSize = params.cellSize || 20;
                const scale = Math.min((canvasWidth * 0.8) / width, (canvasHeight * 0.8) / height);

                ctx.strokeStyle = params.color || '#333333';
                ctx.lineWidth = (params.lineWidth || 1) * scale;
                ctx.beginPath();

                // Vertical lines
                for (let x = 0; x <= width; x += cellSize) {
                    const scaledX = (x - width / 2) * scale;
                    ctx.moveTo(scaledX, -height / 2 * scale);
                    ctx.lineTo(scaledX, height / 2 * scale);
                }

                // Horizontal lines
                for (let y = 0; y <= height; y += cellSize) {
                    const scaledY = (y - height / 2) * scale;
                    ctx.moveTo(-width / 2 * scale, scaledY);
                    ctx.lineTo(width / 2 * scale, scaledY);
                }

                ctx.stroke();
                break;
            }

            case 'drawImage': {
                // Show a placeholder icon for images
                ctx.fillStyle = params.color || '#888888';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🖼️', 0, 0);
                break;
            }

            default:
                // For unknown draw types, show a placeholder icon
                ctx.fillStyle = params.color || '#ffffff';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', 0, 0);
                break;
        }

        ctx.restore();
    }

    /**
     * Show a modal with a larger preview of the drawing action
     */
    showDrawingPreviewModal(element) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #2a2a2a;
            border: 2px solid #4a6a4a;
            border-radius: 8px;
            padding: 20px;
            max-width: 600px;
            max-height: 80vh;
            overflow: auto;
        `;

        // Title
        const title = document.createElement('h3');
        title.textContent = `${this.formatElementLabel(element, 'actions')} Preview`;
        title.style.cssText = 'color: #fff; margin-top: 0; margin-bottom: 15px;';
        modal.appendChild(title);

        // Canvas container with dark background
        const canvasContainer = document.createElement('div');
        canvasContainer.style.cssText = `
            background: #1a1a1a;
            padding: 20px;
            border-radius: 4px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 15px;
        `;

        // Large preview canvas
        const previewSize = 400;
        const largeCanvas = this.createDrawingPreview(element, previewSize, previewSize);
        largeCanvas.style.cssText = 'border: 1px solid #4a6a4a;';
        canvasContainer.appendChild(largeCanvas);
        modal.appendChild(canvasContainer);

        // Parameters display
        if (element.params && Object.keys(element.params).length > 0) {
            const paramsDiv = document.createElement('div');
            paramsDiv.style.cssText = `
                background: #1a1a1a;
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 15px;
            `;

            const paramsTitle = document.createElement('div');
            paramsTitle.textContent = 'Parameters:';
            paramsTitle.style.cssText = 'color: #888; font-size: 12px; margin-bottom: 8px;';
            paramsDiv.appendChild(paramsTitle);

            const paramsList = document.createElement('div');
            paramsList.style.cssText = 'display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 12px;';

            Object.entries(element.params).forEach(([key, value]) => {
                const keyEl = document.createElement('div');
                keyEl.textContent = key + ':';
                keyEl.style.cssText = 'color: #4a7c59; font-weight: bold;';

                const valueEl = document.createElement('div');
                valueEl.textContent = typeof value === 'string' ? `"${value}"` : String(value);
                valueEl.style.cssText = 'color: #fff;';

                paramsList.appendChild(keyEl);
                paramsList.appendChild(valueEl);
            });

            paramsDiv.appendChild(paramsList);
            modal.appendChild(paramsDiv);
        }

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 8px 16px;
            background: #4a7c59;
            border: none;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
        `;
        closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = '#5a8c69');
        closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = '#4a7c59');
        closeBtn.addEventListener('click', () => overlay.remove());
        modal.appendChild(closeBtn);

        overlay.appendChild(modal);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        document.body.appendChild(overlay);
    }

    /**
     * Recursively collect all drawing actions from an actions array (including nested)
     */
    getAllDrawingActions(actions, result = []) {
        if (!actions || !Array.isArray(actions)) return result;

        actions.forEach(action => {
            // If it's a drawing action, add it
            if (action.type && action.type.startsWith('draw')) {
                result.push(action);
            }

            // Recursively check nested actions (for if blocks, etc.)
            if (action.actions) {
                this.getAllDrawingActions(action.actions, result);
            }
            if (action.elseActions) {
                this.getAllDrawingActions(action.elseActions, result);
            }
        });

        return result;
    }

    /**
     * Create a combined preview of multiple drawing actions
     */
    createCombinedDrawingPreview(drawingActions, width, height) {
        if (!drawingActions || drawingActions.length === 0) return null;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);

        // Set up centered coordinate system
        ctx.save();
        ctx.translate(width / 2, height / 2);

        try {
            // Render all drawing actions
            drawingActions.forEach(action => {
                this.renderDrawingAction(action, ctx, width, height, 0.6);
            });
        } catch (e) {
            console.error('Error rendering combined drawing preview:', e);
        }

        ctx.restore();
        return canvas;
    }

    /**
     * Show a modal with a large combined preview of all drawing actions
     */
    showCombinedDrawingPreviewModal(drawingActions) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #2a2a2a;
            border: 2px solid #4a7c59;
            border-radius: 8px;
            padding: 20px;
            max-width: 700px;
            max-height: 90vh;
            overflow: auto;
        `;

        // Title
        const title = document.createElement('h3');
        title.textContent = `Draw Event - Combined Preview (${drawingActions.length} action${drawingActions.length !== 1 ? 's' : ''})`;
        title.style.cssText = 'color: #fff; margin-top: 0; margin-bottom: 15px;';
        modal.appendChild(title);

        // Canvas container with dark background
        const canvasContainer = document.createElement('div');
        canvasContainer.style.cssText = `
            background: #1a1a1a;
            padding: 20px;
            border-radius: 4px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 15px;
        `;

        // Large preview canvas
        const previewSize = 500;
        const largeCanvas = this.createCombinedDrawingPreview(drawingActions, previewSize, previewSize);
        largeCanvas.style.cssText = 'border: 1px solid #4a6a4a;';
        canvasContainer.appendChild(largeCanvas);
        modal.appendChild(canvasContainer);

        // List of drawing actions
        const actionsListDiv = document.createElement('div');
        actionsListDiv.style.cssText = `
            background: #1a1a1a;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
            max-height: 200px;
            overflow-y: auto;
        `;

        const actionsTitle = document.createElement('div');
        actionsTitle.textContent = 'Drawing Actions:';
        actionsTitle.style.cssText = 'color: #888; font-size: 12px; margin-bottom: 8px; font-weight: bold;';
        actionsListDiv.appendChild(actionsTitle);

        drawingActions.forEach((action, idx) => {
            const actionItem = document.createElement('div');
            actionItem.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px;
                margin-bottom: 4px;
                background: #2a2a2a;
                border-radius: 4px;
                border-left: 3px solid #4a7c59;
            `;

            // Number badge
            const badge = document.createElement('span');
            badge.textContent = `${idx + 1}`;
            badge.style.cssText = `
                background: #4a7c59;
                color: #fff;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: bold;
                min-width: 20px;
                text-align: center;
            `;

            // Action label
            const label = document.createElement('span');
            label.textContent = this.formatElementLabel(action, 'actions');
            label.style.cssText = 'color: #fff; font-size: 12px; flex: 1;';

            // Small preview
            const smallPreview = this.createDrawingPreview(action, 32, 32);
            smallPreview.style.cssText = `
                border: 1px solid #4a6a4a;
                border-radius: 3px;
            `;

            actionItem.appendChild(badge);
            actionItem.appendChild(label);
            actionItem.appendChild(smallPreview);

            actionsListDiv.appendChild(actionItem);
        });

        modal.appendChild(actionsListDiv);

        // Info text
        const infoText = document.createElement('div');
        infoText.textContent = 'This preview shows how all drawing actions in the draw event will appear together.';
        infoText.style.cssText = `
            color: #888;
            font-size: 11px;
            font-style: italic;
            margin-bottom: 15px;
            padding: 8px;
            background: #1a1a1a;
            border-radius: 4px;
        `;
        modal.appendChild(infoText);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 8px 16px;
            background: #4a7c59;
            border: none;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
        `;
        closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = '#5a8c69');
        closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = '#4a7c59');
        closeBtn.addEventListener('click', () => overlay.remove());
        modal.appendChild(closeBtn);

        overlay.appendChild(modal);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        document.body.appendChild(overlay);
    }

    updateCode() {
        const code = this.generateModuleCode();
        const textarea = this.codeView.querySelector('.generated-code');
        if (textarea) {
            textarea.value = code;
        }

        // Update CodeMirror if it exists
        if (this.codeEditor) {
            this.codeEditor.setValue(code);
        }
    }

    generateModuleCode() {
        const className = this.projectName.replace(/\s+/g, '');

        let code = `class ${className} extends Module {\n`;
        code += `    static namespace = "${this.moduleNamespace}";\n`;
        code += `    static description = "${this.moduleDescription}";\n`;
        code += `    static allowMultiple = false;\n`;
        code += `    static iconClass = "fas fa-cube";\n`;
        code += `    static color = "#3b5c3bff";\n\n`;

        code += `    constructor() {\n`;
        code += `        super("${className}");\n\n`;

        // Initialize properties
        if (this.properties.length > 0) {
            code += `        // Properties\n`;
            this.properties.forEach(prop => {
                const value = this.formatPropertyValue(prop.defaultValue, prop.type);
                code += `        this.${prop.name} = ${value};\n`;
            });
            code += `\n`;

            // Expose properties with onChange handlers
            const exposedProps = this.properties.filter(p => p.exposed);
            if (exposedProps.length > 0) {
                code += `        // Expose properties to inspector\n`;
                exposedProps.forEach(prop => {
                    // Build options object properties
                    let optionsContent = '';

                    // Always include onChange handler
                    if (prop.onChange && prop.onChange.trim()) {
                        optionsContent += `            onChange: ${prop.onChange.trim()}`;
                    } else {
                        optionsContent += `            onChange: (val) => { this.${prop.name} = val; }`;
                    }

                    // Add description if present
                    if (prop.description && prop.description.trim()) {
                        optionsContent += `,\n            description: "${prop.description.trim().replace(/"/g, '\\"')}"`;
                    }

                    // Add style/group if present
                    if (prop.style && prop.style.trim()) {
                        optionsContent += `,\n            style: "${prop.style.trim()}"`;
                    }

                    // Generate exposeProperty call
                    code += `        this.exposeProperty("${prop.name}", "${prop.type}", this.${prop.name}, {\n`;
                    code += optionsContent + '\n';
                    code += `        });\n`;
                });
                code += `\n`;
            }
        }

        code += `    }\n\n`;

        // Generate style method with grouped properties
        code += `    style(style) {\n`;

        if (this.properties.length > 0) {
            const exposedProps = this.properties.filter(p => p.exposed);

            if (exposedProps.length > 0) {
                // Group properties by their style field
                const groupedProps = {};
                const ungroupedProps = [];

                exposedProps.forEach(prop => {
                    if (prop.style && prop.style.trim()) {
                        const groupName = prop.style.trim();
                        if (!groupedProps[groupName]) {
                            groupedProps[groupName] = [];
                        }
                        groupedProps[groupName].push(prop);
                    } else {
                        ungroupedProps.push(prop);
                    }
                });

                // Generate ungrouped properties first
                if (ungroupedProps.length > 0) {
                    ungroupedProps.forEach(prop => {
                        code += this.generateStylePropertyCode(prop, '        ');
                    });

                    // Add divider if there are also grouped properties
                    if (Object.keys(groupedProps).length > 0) {
                        code += `\n        style.addDivider();\n\n`;
                    }
                }

                // Generate grouped properties
                const groupNames = Object.keys(groupedProps);
                groupNames.forEach((groupName, groupIndex) => {
                    const props = groupedProps[groupName];

                    code += `        style.startGroup("${groupName}", false, {\n`;
                    code += `            backgroundColor: 'rgba(100,150,255,0.1)',\n`;
                    code += `            borderRadius: '6px',\n`;
                    code += `            padding: '8px'\n`;
                    code += `        });\n\n`;

                    props.forEach(prop => {
                        code += this.generateStylePropertyCode(prop, '        ');
                    });

                    code += `\n        style.endGroup();\n`;

                    // Add divider between groups (except after last group)
                    if (groupIndex < groupNames.length - 1) {
                        code += `\n        style.addDivider();\n`;
                    }

                    code += `\n`;
                });
            }
        }

        code += `    }\n\n`;

        // Generate event methods
        this.events.forEach(event => {
            code += this.generateEventCode(event);
        });

        // toJSON with serialized properties
        code += `    toJSON() {\n`;
        code += `        return {\n`;
        code += `            ...super.toJSON()`;

        const serializedProps = this.properties.filter(p => p.serialized);
        if (serializedProps.length > 0) {
            serializedProps.forEach(prop => {
                code += `,\n`;
                code += `            ${prop.name}: this.${prop.name}\n`;
            });
        }

        code += `        };\n`;
        code += `    }\n\n`;

        // fromJSON with serialized properties
        code += `    fromJSON(data) {\n`;
        code += `        super.fromJSON(data);\n`;
        code += `        if (!data) return;\n`;

        if (this.properties.length > 0) {
            code += `        // Initialize properties if not present in data\n`;
            this.properties.forEach(prop => {
                const value = this.formatPropertyValue(prop.defaultValue, prop.type);
                code += `        if (data.${prop.name} !== undefined) {\n`;
                code += `            this.${prop.name} = data.${prop.name};\n`;
                code += `        } else {\n`;
                code += `            this.${prop.name} = ${value};\n`;
                code += `        }\n`;
            });
            code += `\n`;
        }

        code += `    }\n`;
        code += `}\n\n`;
        code += `window.${className} = ${className};`;

        const formatter = new JSCodeFormatter({
            indentSize: 4,
            indentChar: ' '
        });

        const formatted = formatter.format(code);

        return formatted;
    }

    generateMelodiCodeEventCode(event) {
        const methodName = event.melodicodeName || 'buildMelodiCodeScript';

        let code = `    ${methodName}() {\n`;
        code += `        let script = '';\n\n`;

        // Generate code for each action in the melodicode event
        if (event.actions && event.actions.length > 0) {
            event.actions.forEach(action => {
                const def = this.getActionDefinition(action.type);
                if (def) {
                    const actionCode = def.toJavascriptCode(action.params, action, '        ');
                    code += actionCode + '\n';
                }
            });
        }

        code += `\n        return script;\n`;
        code += `    }\n\n`;
        return code;
    }

    generateStylePropertyCode(prop, indent) {
        let code = `${indent}style.exposeProperty("${prop.name}", "${prop.type}", this.${prop.name}, {\n`;

        // Add description if present
        if (prop.description && prop.description.trim()) {
            code += `${indent}    description: "${prop.description.trim().replace(/"/g, '\\"')}",\n`;
        }

        code += `${indent}});\n\n`;

        return code;
    }

    // Generate code with lowercase starting letter for camelCase, and the rest uppercase first letter of each word removed
    toCamelCase(str) {
        // Remove spaces and convert to camelCase
        // First, split by spaces or convert existing camelCase to space-separated
        return str
            .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
            .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
            .split(/\s+/) // Split by spaces
            .map((word, index) => {
                if (index === 0) {
                    return word.toLowerCase();
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join('');
    }

    generateEventCode(event) {
        // Special handling for MelodiCode events
        if (event.name === 'melodicode') {
            return this.generateMelodiCodeEventCode(event);
        }

        let code = `    ${event.name}(`;

        // Add parameters based on event type
        if (event.type === 'custom' && event.params) {
            code += event.params;
        } else if (event.name === 'loop' || event.name === 'beginLoop' || event.name === 'endLoop') {
            code += 'deltaTime';
        } else if (event.name === 'draw') {
            code += 'ctx';
        }

        code += `) {\n`;

        // Generate conditions - wrap simple conditions in if statements
        if (event.conditions && event.conditions.length > 0) {
            // Separate nested condition blocks from simple conditions
            const simpleConditions = [];
            const nestedConditions = [];

            event.conditions.forEach(cond => {
                const def = this.getConditionDefinition(cond.type);
                if (def && def.supportsNested) {
                    nestedConditions.push(cond);
                } else {
                    simpleConditions.push(cond);
                }
            });

            // If we have simple conditions, wrap them in an if statement
            if (simpleConditions.length > 0) {
                const conditionCodes = simpleConditions.map(cond => {
                    const def = this.getConditionDefinition(cond.type);
                    return def ? def.toJavascriptCode(cond.params, cond, '') : 'true';
                }).filter(Boolean);

                code += `        if (${conditionCodes.join(' && ')}) {\n`;

                // Add actions inside the if block
                event.actions.forEach(action => {
                    code += this.generateElementCode(action, 'actions', '            ');
                });

                code += `        }\n`;
            }

            // Add nested condition blocks (they handle their own if statements)
            nestedConditions.forEach(cond => {
                code += this.generateElementCode(cond, 'conditions', '        ');
            });

            // If we only have nested conditions (no simple conditions), add actions outside
            if (simpleConditions.length === 0 && nestedConditions.length > 0) {
                event.actions.forEach(action => {
                    code += this.generateElementCode(action, 'actions', '        ');
                });
            }
        } else {
            // No conditions, just add actions directly
            event.actions.forEach(action => {
                code += this.generateElementCode(action, 'actions', '        ');
            });
        }

        code += `    }\n\n`;
        return code;
    }

    generateElementCode(element, type, indent) {
        let def = type === 'conditions' ?
            this.getConditionDefinition(element.type) :
            this.getActionDefinition(element.type);

        // If not found in actions, try conditions (for nested if blocks in actions)
        if (!def && type === 'actions') {
            def = this.getConditionDefinition(element.type);
        }

        if (!def) return '';

        // For nested structures like if/block
        if (def.supportsNested) {
            return def.toJavascriptCode(element.params, element, indent) + '\n';
        }

        // For actions
        if (type === 'actions') {
            return def.toJavascriptCode(element.params, element, indent) + '\n';
        }

        // Simple conditions are handled in generateEventCode
        return '';
    }

    copyCodeToClipboard() {
        const code = this.generateModuleCode();
        navigator.clipboard.writeText(code).then(() => {
            alert('Code copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy code:', err);
            alert('Failed to copy code. Please copy manually from the text area.');
        });
    }

    /**
 * Save project to File Browser as .esp file
 */
    async saveProjectToFileBrowser() {
        if (!window.fileBrowser) {
            alert('File Browser not available');
            return;
        }

        const data = {
            projectName: this.projectName,
            namespace: this.moduleNamespace,
            description: this.moduleDescription,
            events: this.events,
            properties: this.properties,
            version: "1.0.0",
            createdAt: Date.now()
        };

        const json = JSON.stringify(data, null, 2);
        const fileName = `${this.projectName.replace(/\s+/g, '_')}.esp`;
        const currentPath = window.fileBrowser.currentPath || '/';
        const filePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;

        try {
            const success = await window.fileBrowser.createFile(filePath, json, true);
            if (success) {
                alert(`Project saved as ${fileName}`);
                await window.fileBrowser.loadContent(currentPath);
            } else {
                alert('Failed to save project');
            }
        } catch (error) {
            console.error('Error saving project:', error);
            alert('Error saving project: ' + error.message);
        }
    }

    async loadProjectFromFileBrowser() {
        if (!window.fileBrowser || !window.fileBrowser.db) {
            alert('File Browser not available');
            return;
        }

        // Get all .esp files
        const transaction = window.fileBrowser.db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const allFiles = await new Promise(resolve => {
            store.getAll().onsuccess = e => resolve(e.target.result);
        });

        const espFiles = allFiles.filter(file =>
            file.type === 'file' && file.name.endsWith('.esp')
        );

        if (espFiles.length === 0) {
            alert('No .esp files found. Save a project first.');
            return;
        }

        // Create file picker modal
        this.showFilePicker(espFiles, async (selectedFile) => {
            try {
                const fileData = await window.fileBrowser.readFile(selectedFile.path);
                const data = JSON.parse(fileData);

                this.projectName = data.projectName || 'NewModule';
                this.moduleNamespace = data.namespace || 'Custom';
                this.moduleDescription = data.description || 'Generated from Event Sheet';
                this.events = data.events || [];
                this.properties = data.properties || [];

                // Update UI
                const nameInput = this.toolbar.querySelector('input[type="text"]');
                if (nameInput) nameInput.value = this.projectName;

                this.renderEventSheet();
                this.renderPropertiesView();
                this.updateCode();

                alert('Project loaded successfully!');
            } catch (err) {
                console.error('Failed to load project:', err);
                alert('Failed to load project: ' + err.message);
            }
        });
    }

    /**
     * Get predefined example projects
     */
    getExampleProjects() {
        return [
            {
                name: "Simple Bouncing Ball",
                description: "A ball that bounces around the screen with physics",
                category: "Basic",
                data: {
                    projectName: "BouncingBall",
                    namespace: "Examples",
                    description: "A simple bouncing ball with collision detection",
                    properties: [
                        { name: "velocityX", type: "number", default: 100, exposed: true, serialized: true, description: "Horizontal velocity" },
                        { name: "velocityY", type: "number", default: 50, exposed: true, serialized: true, description: "Vertical velocity" },
                        { name: "gravity", type: "number", default: 500, exposed: true, serialized: true, description: "Gravity acceleration" },
                        { name: "bounceMultiplier", type: "number", default: 0.8, exposed: true, serialized: true, description: "Energy loss on bounce" }
                    ],
                    events: [
                        {
                            type: "start",
                            actions: [
                                { type: "setPosition", params: { x: 400, y: 100 } }
                            ]
                        },
                        {
                            type: "loop",
                            actions: [
                                { type: "setProperty", params: { property: "this.velocityY", value: "this.velocityY + this.gravity * deltaTime" } },
                                { type: "move", params: { x: "this.velocityX", y: "this.velocityY", useDeltaTime: true } },
                                {
                                    type: "ifCondition",
                                    conditions: [
                                        { type: "compareNumber", params: { property: "this.gameObject.position.y", operator: ">", value: "this.engine.height - 25" } }
                                    ],
                                    actions: [
                                        { type: "setProperty", params: { property: "this.gameObject.position.y", value: "this.engine.height - 25" } },
                                        { type: "setProperty", params: { property: "this.velocityY", value: "-this.velocityY * this.bounceMultiplier" } }
                                    ]
                                },
                                {
                                    type: "ifCondition",
                                    conditions: [
                                        { type: "compareNumber", params: { property: "this.gameObject.position.x", operator: "<", value: "25" } }
                                    ],
                                    actions: [
                                        { type: "setProperty", params: { property: "this.gameObject.position.x", value: "25" } },
                                        { type: "setProperty", params: { property: "this.velocityX", value: "-this.velocityX" } }
                                    ]
                                },
                                {
                                    type: "ifCondition",
                                    conditions: [
                                        { type: "compareNumber", params: { property: "this.gameObject.position.x", operator: ">", value: "this.engine.width - 25" } }
                                    ],
                                    actions: [
                                        { type: "setProperty", params: { property: "this.gameObject.position.x", value: "this.engine.width - 25" } },
                                        { type: "setProperty", params: { property: "this.velocityX", value: "-this.velocityX" } }
                                    ]
                                }
                            ]
                        },
                        {
                            type: "draw",
                            actions: [
                                { type: "drawCircle", params: { x: 0, y: 0, radius: 25, color: "#ff6b6b" } }
                            ]
                        }
                    ],
                    version: "1.0.0",
                    createdAt: Date.now()
                }
            },
            {
                name: "Keyboard Movement",
                description: "Control a square with arrow keys",
                category: "Input",
                data: {
                    projectName: "KeyboardMovement",
                    namespace: "Examples",
                    description: "Move a square using arrow keys",
                    properties: [
                        { name: "speed", type: "number", default: 200, exposed: true, serialized: true, description: "Movement speed" }
                    ],
                    events: [
                        {
                            type: "start",
                            actions: [
                                { type: "setPosition", params: { x: 400, y: 300 } }
                            ]
                        },
                        {
                            type: "loop",
                            actions: [
                                {
                                    type: "ifCondition",
                                    conditions: [
                                        { type: "keyPressed", params: { key: "ArrowUp" } }
                                    ],
                                    actions: [
                                        { type: "move", params: { x: 0, y: "-this.speed", useDeltaTime: true } }
                                    ]
                                },
                                {
                                    type: "ifCondition",
                                    conditions: [
                                        { type: "keyPressed", params: { key: "ArrowDown" } }
                                    ],
                                    actions: [
                                        { type: "move", params: { x: 0, y: "this.speed", useDeltaTime: true } }
                                    ]
                                },
                                {
                                    type: "ifCondition",
                                    conditions: [
                                        { type: "keyPressed", params: { key: "ArrowLeft" } }
                                    ],
                                    actions: [
                                        { type: "move", params: { x: "-this.speed", y: 0, useDeltaTime: true } }
                                    ]
                                },
                                {
                                    type: "ifCondition",
                                    conditions: [
                                        { type: "keyPressed", params: { key: "ArrowRight" } }
                                    ],
                                    actions: [
                                        { type: "move", params: { x: "this.speed", y: 0, useDeltaTime: true } }
                                    ]
                                }
                            ]
                        },
                        {
                            type: "draw",
                            actions: [
                                { type: "drawRectangle", params: { x: -25, y: -25, width: 50, height: 50, color: "#4ecdc4" } }
                            ]
                        }
                    ],
                    version: "1.0.0",
                    createdAt: Date.now()
                }
            },
            {
                name: "Rotating Spinner",
                description: "A rotating colored square",
                category: "Basic",
                data: {
                    projectName: "RotatingSpinner",
                    namespace: "Examples",
                    description: "A continuously rotating square",
                    properties: [
                        { name: "rotationSpeed", type: "number", default: 90, exposed: true, serialized: true, description: "Degrees per second" }
                    ],
                    events: [
                        {
                            type: "start",
                            actions: [
                                { type: "setPosition", params: { x: 400, y: 300 } }
                            ]
                        },
                        {
                            type: "loop",
                            actions: [
                                { type: "rotate", params: { amount: "this.rotationSpeed", useDeltaTime: true } }
                            ]
                        },
                        {
                            type: "draw",
                            actions: [
                                { type: "drawRectangle", params: { x: -40, y: -40, width: 80, height: 80, color: "#9b59b6" } }
                            ]
                        }
                    ],
                    version: "1.0.0",
                    createdAt: Date.now()
                }
            },
            {
                name: "Mouse Follower",
                description: "Object that follows the mouse cursor",
                category: "Input",
                data: {
                    projectName: "MouseFollower",
                    namespace: "Examples",
                    description: "An object that smoothly follows the mouse cursor",
                    properties: [
                        { name: "followSpeed", type: "number", default: 5, exposed: true, serialized: true, description: "How fast to follow the mouse" }
                    ],
                    events: [
                        {
                            type: "start",
                            actions: [
                                { type: "setPosition", params: { x: 400, y: 300 } }
                            ]
                        },
                        {
                            type: "loop",
                            actions: [
                                { type: "customAction", params: { code: "const dx = this.input.mouse.x - this.gameObject.position.x;\nconst dy = this.input.mouse.y - this.gameObject.position.y;\nthis.gameObject.position.x += dx * this.followSpeed * deltaTime;\nthis.gameObject.position.y += dy * this.followSpeed * deltaTime;" } }
                            ]
                        },
                        {
                            type: "draw",
                            actions: [
                                { type: "drawCircle", params: { x: 0, y: 0, radius: 30, color: "#f39c12" } }
                            ]
                        }
                    ],
                    version: "1.0.0",
                    createdAt: Date.now()
                }
            },
            {
                name: "Click Counter",
                description: "Count clicks and display the number",
                category: "Input",
                data: {
                    projectName: "ClickCounter",
                    namespace: "Examples",
                    description: "Display and increment a click counter",
                    properties: [
                        { name: "clickCount", type: "number", default: 0, exposed: true, serialized: true, description: "Number of clicks" }
                    ],
                    events: [
                        {
                            type: "start",
                            actions: [
                                { type: "setPosition", params: { x: 400, y: 300 } }
                            ]
                        },
                        {
                            type: "loop",
                            actions: [
                                {
                                    type: "ifCondition",
                                    conditions: [
                                        { type: "mouseDown", params: { button: "left" } }
                                    ],
                                    actions: [
                                        { type: "setProperty", params: { property: "this.clickCount", value: "this.clickCount + 1" } }
                                    ]
                                }
                            ]
                        },
                        {
                            type: "draw",
                            actions: [
                                { type: "drawRectangle", params: { x: -100, y: -40, width: 200, height: 80, color: "#3498db" } },
                                { type: "drawText", params: { text: "`Clicks: ${this.clickCount}`", x: 0, y: 5, color: "#ffffff", fontSize: 24, font: "Arial", align: "center" } }
                            ]
                        }
                    ],
                    version: "1.0.0",
                    createdAt: Date.now()
                }
            },
            {
                name: "Pulsing Circle",
                description: "A circle that grows and shrinks rhythmically",
                category: "Animation",
                data: {
                    projectName: "PulsingCircle",
                    namespace: "Examples",
                    description: "A circle with pulsing animation",
                    properties: [
                        { name: "pulseTime", type: "number", default: 0, exposed: false, serialized: false, description: "Time counter for pulse" },
                        { name: "pulseSpeed", type: "number", default: 2, exposed: true, serialized: true, description: "Speed of pulsing" },
                        { name: "minRadius", type: "number", default: 20, exposed: true, serialized: true, description: "Minimum radius" },
                        { name: "maxRadius", type: "number", default: 50, exposed: true, serialized: true, description: "Maximum radius" }
                    ],
                    events: [
                        {
                            type: "start",
                            actions: [
                                { type: "setPosition", params: { x: 400, y: 300 } }
                            ]
                        },
                        {
                            type: "loop",
                            actions: [
                                { type: "setProperty", params: { property: "this.pulseTime", value: "this.pulseTime + this.pulseSpeed * deltaTime" } }
                            ]
                        },
                        {
                            type: "draw",
                            actions: [
                                { type: "customAction", params: { code: "const radius = this.minRadius + (Math.sin(this.pulseTime) * 0.5 + 0.5) * (this.maxRadius - this.minRadius);\nctx.fillStyle = '#e74c3c';\nctx.beginPath();\nctx.arc(0, 0, radius, 0, Math.PI * 2);\nctx.fill();" } }
                            ]
                        }
                    ],
                    version: "1.0.0",
                    createdAt: Date.now()
                }
            },
            {
                name: "Rainbow Trail",
                description: "Draw circles with changing colors using a loop",
                category: "Drawing",
                data: {
                    projectName: "RainbowTrail",
                    namespace: "Examples",
                    description: "Create a rainbow effect using loops",
                    properties: [
                        { name: "hue", type: "number", default: 0, exposed: false, serialized: false, description: "Current hue value" }
                    ],
                    events: [
                        {
                            type: "start",
                            actions: [
                                { type: "setPosition", params: { x: 400, y: 300 } }
                            ]
                        },
                        {
                            type: "loop",
                            actions: [
                                { type: "setProperty", params: { property: "this.hue", value: "(this.hue + 100 * deltaTime) % 360" } }
                            ]
                        },
                        {
                            type: "draw",
                            actions: [
                                {
                                    type: "forLoop",
                                    params: { variable: "i", start: 0, end: 8, step: 1 },
                                    actions: [
                                        { type: "customAction", params: { code: "const angle = (i / 8) * Math.PI * 2;\nconst distance = 60;\nconst x = Math.cos(angle) * distance;\nconst y = Math.sin(angle) * distance;\nconst hue = (this.hue + i * 45) % 360;\nctx.fillStyle = `hsl(${hue}, 100%, 50%)`;\nctx.beginPath();\nctx.arc(x, y, 15, 0, Math.PI * 2);\nctx.fill();" } }
                                    ]
                                }
                            ]
                        }
                    ],
                    version: "1.0.0",
                    createdAt: Date.now()
                }
            },
            {
                name: "Simple Timer",
                description: "A countdown timer that displays remaining time",
                category: "Logic",
                data: {
                    projectName: "SimpleTimer",
                    namespace: "Examples",
                    description: "Countdown timer with visual display",
                    properties: [
                        { name: "timeRemaining", type: "number", default: 10, exposed: true, serialized: true, description: "Seconds remaining" },
                        { name: "isFinished", type: "boolean", default: false, exposed: false, serialized: false, description: "Timer finished flag" }
                    ],
                    events: [
                        {
                            type: "start",
                            actions: [
                                { type: "setPosition", params: { x: 400, y: 300 } }
                            ]
                        },
                        {
                            type: "loop",
                            actions: [
                                {
                                    type: "ifCondition",
                                    conditions: [
                                        { type: "compareNumber", params: { property: "this.timeRemaining", operator: ">", value: "0" } }
                                    ],
                                    actions: [
                                        { type: "setProperty", params: { property: "this.timeRemaining", value: "this.timeRemaining - deltaTime" } }
                                    ],
                                    elseActions: [
                                        { type: "setProperty", params: { property: "this.timeRemaining", value: "0" } },
                                        { type: "setProperty", params: { property: "this.isFinished", value: "true" } }
                                    ]
                                }
                            ]
                        },
                        {
                            type: "draw",
                            actions: [
                                {
                                    type: "ifCondition",
                                    conditions: [
                                        { type: "customCondition", params: { code: "this.isFinished === false" } }
                                    ],
                                    actions: [
                                        { type: "drawText", params: { text: "`Time: ${Math.ceil(this.timeRemaining)}`", x: 0, y: 0, color: "#2ecc71", fontSize: 32, font: "Arial", align: "center" } }
                                    ],
                                    elseActions: [
                                        { type: "drawText", params: { text: "\"Time's Up!\"", x: 0, y: 0, color: "#e74c3c", fontSize: 32, font: "Arial", align: "center" } }
                                    ]
                                }
                            ]
                        }
                    ],
                    version: "1.0.0",
                    createdAt: Date.now()
                }
            },
            {
                name: "Sine Wave Motion",
                description: "Object moving in a sine wave pattern",
                category: "Animation",
                data: {
                    projectName: "SineWaveMotion",
                    namespace: "Examples",
                    description: "Move in a sine wave pattern",
                    properties: [
                        { name: "time", type: "number", default: 0, exposed: false, serialized: false, description: "Time accumulator" },
                        { name: "frequency", type: "number", default: 2, exposed: true, serialized: true, description: "Wave frequency" },
                        { name: "amplitude", type: "number", default: 100, exposed: true, serialized: true, description: "Wave amplitude" },
                        { name: "speed", type: "number", default: 100, exposed: true, serialized: true, description: "Horizontal speed" }
                    ],
                    events: [
                        {
                            type: "start",
                            actions: [
                                { type: "setPosition", params: { x: 100, y: 300 } }
                            ]
                        },
                        {
                            type: "loop",
                            actions: [
                                { type: "setProperty", params: { property: "this.time", value: "this.time + deltaTime" } },
                                { type: "move", params: { x: "this.speed", y: 0, useDeltaTime: true } },
                                { type: "customAction", params: { code: "const yOffset = Math.sin(this.time * this.frequency) * this.amplitude;\nthis.gameObject.position.y = 300 + yOffset;" } },
                                {
                                    type: "ifCondition",
                                    conditions: [
                                        { type: "compareNumber", params: { property: "this.gameObject.position.x", operator: ">", value: "this.engine.width + 50" } }
                                    ],
                                    actions: [
                                        { type: "setProperty", params: { property: "this.gameObject.position.x", value: "-50" } }
                                    ]
                                }
                            ]
                        },
                        {
                            type: "draw",
                            actions: [
                                { type: "drawCircle", params: { x: 0, y: 0, radius: 20, color: "#1abc9c" } }
                            ]
                        }
                    ],
                    version: "1.0.0",
                    createdAt: Date.now()
                }
            },
            {
                name: "Particle System Event Sheet",
                description: "Simple particle spawner with array management",
                category: "Advanced",
                data: {
                    projectName: "ParticleSystemEventSheet",
                    namespace: "Examples",
                    description: "Create and manage particles using arrays",
                    properties: [
                        { name: "particles", type: "array", default: "[]", exposed: false, serialized: false, description: "Array of active particles" },
                        { name: "spawnTimer", type: "number", default: 0, exposed: false, serialized: false, description: "Timer for spawning" },
                        { name: "spawnRate", type: "number", default: 0.1, exposed: true, serialized: true, description: "Seconds between spawns" }
                    ],
                    events: [
                        {
                            type: "start",
                            actions: [
                                { type: "setPosition", params: { x: 400, y: 300 } },
                                { type: "setProperty", params: { property: "this.particles", value: "[]" } }
                            ]
                        },
                        {
                            type: "loop",
                            actions: [
                                { type: "setProperty", params: { property: "this.spawnTimer", value: "this.spawnTimer + deltaTime" } },
                                {
                                    type: "ifCondition",
                                    conditions: [
                                        { type: "compareNumber", params: { property: "this.spawnTimer", operator: ">=", value: "this.spawnRate" } }
                                    ],
                                    actions: [
                                        { type: "setProperty", params: { property: "this.spawnTimer", value: "0" } },
                                        { type: "customAction", params: { code: "this.particles.push({\n    x: 0,\n    y: 0,\n    vx: (Math.random() - 0.5) * 200,\n    vy: (Math.random() - 0.5) * 200,\n    life: 1.0,\n    color: `hsl(${Math.random() * 360}, 100%, 50%)`\n});" } }
                                    ]
                                },
                                {
                                    type: "forEachLoop",
                                    params: { variable: "particle", array: "this.particles" },
                                    actions: [
                                        { type: "customAction", params: { code: "particle.x += particle.vx * deltaTime;\nparticle.y += particle.vy * deltaTime;\nparticle.life -= deltaTime;" } }
                                    ]
                                },
                                { type: "setProperty", params: { property: "this.particles", value: "this.particles.filter(p => p.life > 0)" } }
                            ]
                        },
                        {
                            type: "draw",
                            actions: [
                                {
                                    type: "forEachLoop",
                                    params: { variable: "particle", array: "this.particles" },
                                    actions: [
                                        { type: "customAction", params: { code: "const alpha = particle.life;\nctx.globalAlpha = alpha;\nctx.fillStyle = particle.color;\nctx.beginPath();\nctx.arc(particle.x, particle.y, 8, 0, Math.PI * 2);\nctx.fill();" } }
                                    ]
                                },
                                { type: "customAction", params: { code: "ctx.globalAlpha = 1;" } }
                            ]
                        }
                    ],
                    version: "1.0.0",
                    createdAt: Date.now()
                }
            }
        ];
    }

    /**
     * Show example selector modal
     */
    showExampleSelector() {
        const examples = this.getExampleProjects();

        // Group examples by category
        const categories = {};
        examples.forEach(example => {
            if (!categories[example.category]) {
                categories[example.category] = [];
            }
            categories[example.category].push(example);
        });

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: #2a2a2a;
            border: 1px solid #555;
            border-radius: 8px;
            width: 800px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px;
            border-bottom: 1px solid #555;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Load Example Project';
        title.style.cssText = 'margin: 0; color: #fff; font-size: 20px;';
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: #fff;
            font-size: 32px;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
        `;
        closeBtn.addEventListener('mouseover', () => closeBtn.style.background = '#555');
        closeBtn.addEventListener('mouseout', () => closeBtn.style.background = 'none');
        closeBtn.addEventListener('click', () => document.body.removeChild(modal));
        header.appendChild(closeBtn);

        container.appendChild(header);

        const content = document.createElement('div');
        content.style.cssText = `
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        `;

        // Create category sections
        Object.keys(categories).sort().forEach(categoryName => {
            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = categoryName;
            categoryTitle.style.cssText = `
                color: #e7db6c;
                margin: 20px 0 10px 0;
                font-size: 16px;
                border-bottom: 1px solid #444;
                padding-bottom: 5px;
            `;
            content.appendChild(categoryTitle);

            const grid = document.createElement('div');
            grid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            `;

            categories[categoryName].forEach(example => {
                const card = document.createElement('div');
                card.style.cssText = `
                    background: #333;
                    border: 1px solid #555;
                    border-radius: 6px;
                    padding: 15px;
                    cursor: pointer;
                    transition: all 0.2s;
                `;
                card.addEventListener('mouseover', () => {
                    card.style.background = '#3a3a3a';
                    card.style.borderColor = '#e7db6c';
                    card.style.transform = 'translateY(-2px)';
                });
                card.addEventListener('mouseout', () => {
                    card.style.background = '#333';
                    card.style.borderColor = '#555';
                    card.style.transform = 'translateY(0)';
                });

                const cardTitle = document.createElement('div');
                cardTitle.textContent = example.name;
                cardTitle.style.cssText = `
                    color: #fff;
                    font-weight: bold;
                    font-size: 14px;
                    margin-bottom: 8px;
                `;
                card.appendChild(cardTitle);

                const cardDesc = document.createElement('div');
                cardDesc.textContent = example.description;
                cardDesc.style.cssText = `
                    color: #aaa;
                    font-size: 12px;
                    line-height: 1.4;
                `;
                card.appendChild(cardDesc);

                card.addEventListener('click', () => {
                    this.loadExample(example.data);
                    document.body.removeChild(modal);
                });

                grid.appendChild(card);
            });

            content.appendChild(grid);
        });

        container.appendChild(content);
        modal.appendChild(container);
        document.body.appendChild(modal);

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Load an example project
     */
    loadExample(data) {
        this.projectName = data.projectName || 'NewModule';
        this.moduleNamespace = data.namespace || 'Custom';
        this.moduleDescription = data.description || 'Generated from Event Sheet';

        // Normalize properties - ensure they have proper structure
        this.properties = (data.properties || []).map(prop => {
            return {
                name: prop.name,
                type: prop.type || 'string',
                defaultValue: prop.defaultValue !== undefined ? prop.defaultValue : (prop.default !== undefined ? prop.default : this.getDefaultValueForType(prop.type || 'string')),
                exposed: prop.exposed !== undefined ? prop.exposed : false,
                serialized: prop.serialized !== undefined ? prop.serialized : false,
                description: prop.description || '',
                onChange: prop.onChange
            };
        });

        // Normalize events - ensure they have proper structure
        this.events = (data.events || []).map(event => {
            // If event has type but no name, set name from type
            // This fixes old format: {type: 'start'} -> {type: 'event', name: 'start'}
            const normalizedEvent = {
                ...event,
                id: event.id || this.generateId(),
                type: event.type === 'custom' || event.type === 'event' ? event.type : 'event',
                name: event.name || event.type, // Use name if exists, otherwise use type
                conditions: event.conditions || [],
                actions: event.actions || []
            };

            // For custom events, preserve params
            if (event.type === 'custom' && event.params) {
                normalizedEvent.params = event.params;
            }

            return normalizedEvent;
        });

        // Update UI
        const nameInput = this.toolbar.querySelector('input[type="text"]');
        if (nameInput) nameInput.value = this.projectName;

        this.renderEventSheet();
        this.renderPropertiesView();
        this.updateCode();

        console.log(`Loaded example: ${this.projectName}`);
    }

    /**
     * Show file picker modal
     */
    showFilePicker(files, onSelect) {
        const modal = document.createElement('div');
        modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
    `;

        const content = document.createElement('div');
        content.style.cssText = `
        background: #2a2a2a;
        border: 1px solid #555;
        border-radius: 8px;
        padding: 20px;
        min-width: 400px;
        max-width: 600px;
        max-height: 500px;
        display: flex;
        flex-direction: column;
    `;

        const title = document.createElement('h3');
        title.textContent = 'Select Event Sheet Project';
        title.style.cssText = 'margin: 0 0 15px 0; color: #fff;';
        content.appendChild(title);

        const fileList = document.createElement('div');
        fileList.style.cssText = `
        flex: 1;
        overflow-y: auto;
        margin-bottom: 15px;
    `;

        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.style.cssText = `
            padding: 12px;
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
        `;

            fileItem.addEventListener('mouseenter', () => {
                fileItem.style.background = '#444';
                fileItem.style.borderColor = '#4a7c59';
            });

            fileItem.addEventListener('mouseleave', () => {
                fileItem.style.background = '#333';
                fileItem.style.borderColor = '#555';
            });

            const fileName = document.createElement('div');
            fileName.textContent = file.name;
            fileName.style.cssText = 'color: #fff; font-weight: bold; margin-bottom: 4px;';

            const filePath = document.createElement('div');
            filePath.textContent = file.path;
            filePath.style.cssText = 'color: #888; font-size: 11px;';

            fileItem.appendChild(fileName);
            fileItem.appendChild(filePath);

            fileItem.addEventListener('click', () => {
                modal.remove();
                onSelect(file);
            });

            fileList.appendChild(fileItem);
        });

        content.appendChild(fileList);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
        padding: 8px 16px;
        background: #555;
        border: none;
        color: #fff;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
    `;
        cancelBtn.addEventListener('click', () => modal.remove());
        content.appendChild(cancelBtn);

        modal.appendChild(content);
        document.body.appendChild(modal);

        // REMOVED: Do not close modal when clicking outside
    }

    /**
     * Export generated module to File Browser as .js file
     */
    async exportToFileBrowser() {
        if (!window.fileBrowser) {
            alert('File Browser not available');
            return;
        }

        const code = this.generateModuleCode();
        const fileName = `${this.projectName.replace(/\s+/g, '')}.js`;
        const currentPath = window.fileBrowser.currentPath || '/';
        const filePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;

        try {
            const success = await window.fileBrowser.createFile(filePath, code, true);
            if (success) {
                alert(`Module exported as ${fileName}`);
                await window.fileBrowser.loadContent(currentPath);

                // Auto-register the module
                if (window.fileBrowser.checkAndRegisterScript) {
                    await window.fileBrowser.checkAndRegisterScript(filePath, code);
                }
            } else {
                alert('Failed to export module');
            }
        } catch (error) {
            console.error('Error exporting module:', error);
            alert('Error exporting module: ' + error.message);
        }
    }

    formatPropertyValue(value, type) {
        if (value === null || value === undefined) return 'null';
        if (type === 'string') return `"${value}"`;
        if (type === 'boolean') return value ? 'true' : 'false';
        if (type === 'object' || type === 'array') return JSON.stringify(value);
        return String(value);
    }

    showPropertyEditor(property, index = null) {
        const modal = document.createElement('div');
        modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
    `;

        const content = document.createElement('div');
        content.style.cssText = `
        background: #2a2a2a;
        border: 1px solid #555;
        border-radius: 8px;
        padding: 20px;
        min-width: 500px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
    `;

        const title = document.createElement('h3');
        title.textContent = property ? 'Edit Property' : 'Add Property';
        title.style.cssText = 'margin: 0 0 20px 0; color: #fff;';
        content.appendChild(title);

        // Form
        const form = document.createElement('div');
        form.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';

        // Name
        const nameGroup = this.createFormGroup('Property Name', 'text', property?.name || '', 'myProperty');
        const nameInput = nameGroup.querySelector('input');

        // Type
        const typeGroup = this.createFormGroup('Type', 'select', property?.type || 'number', null, [
            { value: 'number', label: 'Number' },
            { value: 'string', label: 'String' },
            { value: 'boolean', label: 'Boolean' },
            { value: 'object', label: 'Object' },
            { value: 'array', label: 'Array' }
        ]);
        const typeSelect = typeGroup.querySelector('select');

        // Default Value
        const defaultGroup = this.createFormGroup('Default Value', 'text',
            property?.defaultValue !== undefined ? String(property.defaultValue) : '0',
            '0'
        );
        const defaultInput = defaultGroup.querySelector('input');

        // Description
        const descGroup = this.createFormGroup('Description (optional)', 'textarea', property?.description || '', 'Property description');
        const descInput = descGroup.querySelector('textarea');

        // Exposed checkbox
        const exposedGroup = this.createCheckboxGroup('Exposed in Inspector', property?.exposed !== false);
        const exposedCheckbox = exposedGroup.querySelector('input');

        // Serialized checkbox
        const serializedGroup = this.createCheckboxGroup('Serialize in JSON', property?.serialized !== false);
        const serializedCheckbox = serializedGroup.querySelector('input');

        // NEW: onChange Event
        const onChangeGroup = this.createFormGroup('onChange Event (optional)', 'textarea',
            property?.onChange || '',
            'e.g., (val) => { console.log(val); }'
        );
        const onChangeInput = onChangeGroup.querySelector('textarea');

        // NEW: Style/Group
        const styleGroup = this.createFormGroup('Style/Group (optional)', 'text',
            property?.style || '',
            'e.g., "Advanced", "Physics", "group"'
        );
        const styleInput = styleGroup.querySelector('input');

        form.appendChild(nameGroup);
        form.appendChild(typeGroup);
        form.appendChild(defaultGroup);
        form.appendChild(descGroup);
        form.appendChild(exposedGroup);
        form.appendChild(serializedGroup);
        //form.appendChild(onChangeGroup);
        form.appendChild(styleGroup);

        content.appendChild(form);

        // Buttons
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;';

        const saveBtn = this.createToolbarButton(property ? 'Update' : 'Add', () => {
            const name = nameInput.value.trim();
            if (!name) {
                alert('Property name is required');
                return;
            }

            // Convert to camelCase to remove spaces
            const camelCaseName = this.toCamelCase(name);

            // Check for duplicate names (skip if editing same property)
            const duplicate = this.properties.find((p, i) => p.name === camelCaseName && i !== index);
            if (duplicate) {
                alert(`Property "${camelCaseName}" already exists`);
                return;
            }

            const type = typeSelect.value;
            let defaultValue = defaultInput.value;

            // Parse default value based on type
            if (type === 'number') {
                defaultValue = parseFloat(defaultValue) || 0;
            } else if (type === 'boolean') {
                defaultValue = defaultValue === 'true' || defaultValue === '1';
            } else if (type === 'object' || type === 'array') {
                try {
                    defaultValue = JSON.parse(defaultValue);
                } catch (e) {
                    defaultValue = type === 'array' ? [] : {};
                }
            }

            const propData = {
                name: camelCaseName, // Use camelCase name
                type,
                defaultValue,
                description: descInput.value.trim(),
                exposed: exposedCheckbox.checked,
                serialized: serializedCheckbox.checked,
                onChange: onChangeInput.value.trim(),
                style: styleInput.value.trim()
            };

            if (index !== null) {
                this.properties[index] = propData;
            } else {
                this.properties.push(propData);
            }

            document.body.removeChild(modal);
            this.renderPropertiesView();
            this.updateCode();
        });

        const cancelBtn = this.createToolbarButton('Cancel', () => {
            document.body.removeChild(modal);
        });
        cancelBtn.style.background = '#666';
        cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.background = '#777');
        cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.background = '#666');

        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(saveBtn);
        content.appendChild(btnContainer);

        modal.appendChild(content);
        document.body.appendChild(modal);

        // REMOVED: Do not close modal when clicking outside
        // modal.addEventListener('click', (e) => {
        //     if (e.target === modal) {
        //         document.body.removeChild(modal);
        //     }
        // });

        nameInput.focus();
    }

    createFormGroup(label, type, value, placeholder, options = null) {
        const group = document.createElement('div');
        group.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = 'color: #fff; font-size: 13px; font-weight: bold;';

        let input;
        if (type === 'select') {
            input = document.createElement('select');
            options?.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                option.selected = value === opt.value;
                input.appendChild(option);
            });
        } else if (type === 'textarea') {
            input = document.createElement('textarea');
            input.value = value;
            input.rows = 3;
        } else {
            input = document.createElement('input');
            input.type = type;
            input.value = value;
        }

        input.placeholder = placeholder || '';
        input.style.cssText = `
        padding: 8px;
        background: #333;
        border: 1px solid #555;
        color: #fff;
        border-radius: 4px;
        font-family: inherit;
        font-size: 13px;
    `;

        group.appendChild(labelEl);
        group.appendChild(input);
        return group;
    }

    createCheckboxGroup(label, checked) {
        const group = document.createElement('div');
        group.style.cssText = 'display: flex; align-items: center; gap: 10px;';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        checkbox.style.cssText = 'cursor: pointer;';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = 'color: #fff; font-size: 13px; cursor: pointer;';
        labelEl.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
        });

        group.appendChild(checkbox);
        group.appendChild(labelEl);
        return group;
    }

    /**
 * Get all public variables/properties from a module class (not starting with _)
 */
    getModuleVariables(ModuleClass) {
        const variables = [];

        try {
            // Create a temporary instance to inspect properties
            const tempInstance = new ModuleClass();

            // Get the source code to extract comments
            const classSource = ModuleClass.toString();

            // Get all own properties
            for (const key in tempInstance) {
                if (tempInstance.hasOwnProperty(key) && !key.startsWith('_') && key !== 'gameObject') {
                    const value = tempInstance[key];
                    const type = this.inferPropertyType(value);

                    // Skip if it's a function (we handle those separately)
                    if (typeof value === 'function') continue;

                    // Skip common internal properties
                    const skipProps = ['type', 'name', 'enabled', 'id', 'exposedProperties', 'ignoreGameObjectTransform'];
                    if (skipProps.includes(key)) continue;

                    variables.push({
                        name: key,
                        type: type,
                        description: this.extractPropertyDescription(classSource, key),
                        defaultValue: value
                    });
                }
            }
        } catch (error) {
            console.warn(`Could not extract variables from ${ModuleClass.name}:`, error);
        }

        return variables;
    }

    /**
     * Infer the type of a property value
     */
    inferPropertyType(value) {
        if (value === null || value === undefined) return 'any';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'string') return 'string';
        if (typeof value === 'boolean') return 'boolean';
        if (Array.isArray(value)) return 'array';
        if (value.constructor && value.constructor.name === 'Vector2') return 'Vector2';
        if (typeof value === 'object') return 'object';
        return 'any';
    }

    /**
     * Extract property description from comment block above the property
     */
    extractPropertyDescription(classSource, propertyName) {
        try {
            // Match property declarations with comments above them
            // Looks for:
            // 1. Single-line comments: // Comment
            // 2. Multi-line comments: /** Comment */
            // 3. Property declaration: this.propertyName = value;

            // Try single-line comment
            const singleLinePattern = new RegExp(
                `\\/\\/\\s*([^\\n]+)\\s*\\n\\s*this\\.${propertyName}\\s*=`,
                'g'
            );
            const singleMatch = singleLinePattern.exec(classSource);
            if (singleMatch) {
                return singleMatch[1].trim();
            }

            // Try multi-line comment
            const multiLinePattern = new RegExp(
                `\\/\\*\\*([\\s\\S]*?)\\*\\/\\s*this\\.${propertyName}\\s*=`,
                'g'
            );
            const multiMatch = multiLinePattern.exec(classSource);
            if (multiMatch) {
                const comment = multiMatch[1];
                const lines = comment.split('\n')
                    .map(line => line.replace(/^\s*\*\s?/, '').trim())
                    .filter(line => line && !line.startsWith('@'));

                if (lines.length > 0) {
                    return lines[0];
                }
            }

            return '';
        } catch (e) {
            console.warn(`Could not extract description for property ${propertyName}:`, e);
            return '';
        }
    }

    /**
     * Get all registered modules and their exposed properties/methods
     */
    getAvailableModules() {
        const modules = [];

        // Try multiple sources for modules
        const moduleSources = [];

        // Source 1: ModuleRegistry
        if (window.moduleRegistry && window.moduleRegistry.modules) {
            window.moduleRegistry.modules.forEach((ModuleClass, className) => {
                moduleSources.push({ className, ModuleClass });
            });
        }

        // Source 2: Global window objects that extend Module
        if (typeof Module !== 'undefined') {
            for (const key in window) {
                try {
                    const obj = window[key];
                    if (typeof obj === 'function' &&
                        obj.prototype instanceof Module &&
                        obj !== Module &&
                        !moduleSources.find(m => m.className === key)) {
                        moduleSources.push({ className: key, ModuleClass: obj });
                    }
                } catch (e) { /* Ignore */ }
            }
        }

        // Process each module
        moduleSources.forEach(({ className, ModuleClass }) => {
            try {
                const tempInstance = new ModuleClass();
                const exposedProps = tempInstance.exposedProperties || [];

                modules.push({
                    className: className,
                    namespace: ModuleClass.namespace || 'General',
                    description: ModuleClass.description || '',
                    properties: exposedProps.map(prop => ({
                        name: prop.name,
                        type: prop.type,
                        description: prop.options?.description || ''
                    })),
                    methods: this.getModuleMethods(ModuleClass),
                    variables: this.getModuleVariables(ModuleClass)
                });
            } catch (error) {
                console.warn(`Could not inspect module ${className}:`, error);
            }
        });

        return modules;
    }

    /**
     * Get public methods from a module class
     */
    getModuleMethods(ModuleClass) {
        const methods = [];
        const prototype = ModuleClass.prototype;
        const methodNames = Object.getOwnPropertyNames(prototype);

        // Get the source code of the class to extract comments
        const classSource = ModuleClass.toString();

        // Common public methods to include
        const publicMethods = ['start', 'loop', 'draw', 'onDestroy', 'preload', 'beginLoop', 'endLoop', 'melodicode'];

        methodNames.forEach(name => {
            if (name !== 'constructor' &&
                typeof prototype[name] === 'function' &&
                (publicMethods.includes(name) || !name.startsWith('_'))) {

                const methodInfo = {
                    name: name,
                    params: this.getMethodParams(prototype[name]),
                    description: this.extractMethodDescription(classSource, name)
                };

                methods.push(methodInfo);
            }
        });

        return methods;
    }

    /**
     * Extract parameter names from a function
     */
    getMethodParams(func) {
        const funcStr = func.toString();
        const match = funcStr.match(/\(([^)]*)\)/);
        if (match && match[1]) {
            return match[1].split(',').map(p => p.trim()).filter(p => p && p !== '');
        }
        return [];
    }

    /**
 * Extract method description from comment block above the method
 */
    extractMethodDescription(classSource, methodName) {
        try {
            // Match the method and any comment blocks above it
            // This regex looks for:
            // 1. Optional whitespace and newlines
            // 2. Multi-line comments (/** ... */) or single-line comments (// ...)
            // 3. The method definition
            const methodPattern = new RegExp(
                `(?:\\/\\*\\*([\\s\\S]*?)\\*\\/\\s*)?(?:\\/\\/\\s*([^\\n]*)\\s*\\n\\s*)*${methodName}\\s*\\(`,
                'g'
            );

            const match = methodPattern.exec(classSource);

            if (match) {
                // Check for JSDoc-style comment (/** ... */)
                if (match[1]) {
                    // Extract description from JSDoc comment
                    const comment = match[1];

                    // Try to extract @description or the first line that isn't a tag
                    const descMatch = comment.match(/@description\s+(.+?)(?=@|\*\/|$)/s);
                    if (descMatch) {
                        return descMatch[1].trim().replace(/\s+/g, ' ');
                    }

                    // Otherwise, get the first non-tag line
                    const lines = comment.split('\n')
                        .map(line => line.replace(/^\s*\*\s?/, '').trim())
                        .filter(line => line && !line.startsWith('@'));

                    if (lines.length > 0) {
                        return lines[0];
                    }
                }

                // Check for single-line comment (//)
                if (match[2]) {
                    return match[2].trim();
                }
            }

            return '';
        } catch (e) {
            console.warn(`Could not extract description for method ${methodName}:`, e);
            return '';
        }
    }

    saveProject() {
        const data = {
            projectName: this.projectName,
            namespace: this.moduleNamespace,
            description: this.moduleDescription,
            events: this.events
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.projectName.replace(/\s+/g, '_')}.eventsheet.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    loadProject() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.eventsheet.json';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    this.projectName = data.projectName || 'NewModule';
                    this.moduleNamespace = data.namespace || 'Custom';
                    this.moduleDescription = data.description || 'Generated from Event Sheet';
                    this.events = data.events || [];

                    // Update UI
                    const nameInput = this.toolbar.querySelector('input[type="text"]');
                    if (nameInput) nameInput.value = this.projectName;

                    this.renderEventSheet();
                    this.updateCode();

                    alert('Project loaded successfully!');
                } catch (err) {
                    console.error('Failed to load project:', err);
                    alert('Failed to load project. Invalid file format.');
                }
            };

            reader.readAsText(file);
        });

        input.click();
    }

    /**
 * Find parent object and array info for an item id.
 * Returns { parent, arrayName, index } or null if not found.
 */
    findParentAndArrayById(itemId) {
        // Check top-level events first
        for (let i = 0; i < this.events.length; i++) {
            if (this.events[i].id === itemId) {
                return { parent: this, arrayName: 'events', index: i };
            }
        }

        // Recursive search within an array
        const nestedArrays = ['conditions', 'actions', 'elseActions'];

        const recurse = (parent, arrayName, arr) => {
            if (!Array.isArray(arr)) return null;
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                if (!item) continue;
                if (item.id === itemId) {
                    return { parent, arrayName, index: i };
                }
                // check nested arrays of this item
                for (const na of nestedArrays) {
                    if (item[na] && Array.isArray(item[na])) {
                        const found = recurse(item, na, item[na]);
                        if (found) return found;
                    }
                }
            }
            return null;
        };

        // Try all events' condition/action arrays
        for (const ev of this.events) {
            // conditions
            const foundC = recurse(ev, 'conditions', ev.conditions || []);
            if (foundC) return foundC;
            // actions
            const foundA = recurse(ev, 'actions', ev.actions || []);
            if (foundA) return foundA;
            // elseActions (already covered if nested, but explicit is fine)
            const foundE = recurse(ev, 'elseActions', ev.elseActions || []);
            if (foundE) return foundE;
        }

        return null;
    }

    createSmallButton(text, onClick, additionalStyles = '') {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            margin-top: 8px;
            padding: 4px 10px;
            background: #3a3a3a;
            border: 1px solid #555;
            color: #aaa;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s;
            ${additionalStyles}
        `;
        btn.addEventListener('mouseenter', () => {
            btn.style.background = '#4a4a4a';
            btn.style.color = '#fff';
            btn.style.transform = 'scale(1.05)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = '#3a3a3a';
            btn.style.color = '#aaa';
            btn.style.transform = 'scale(1)';
        });
        btn.addEventListener('click', onClick);
        return btn;
    }

    createIconButton(icon, title, onClick) {
        const size = this.viewSize === 'small' ? '16px' : '28px';
        const fontSize = this.viewSize === 'small' ? '10px' : '14px';

        const btn = document.createElement('button');
        btn.textContent = icon;
        btn.title = title;
        btn.style.cssText = `
            background: #444;
            border: none;
            color: #fff;
            border-radius: 3px;
            cursor: pointer;
            width: ${size};
            height: ${size};
            font-size: ${fontSize};
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        `;
        btn.addEventListener('mouseenter', () => btn.style.background = '#555');
        btn.addEventListener('mouseleave', () => btn.style.background = '#444');
        btn.addEventListener('click', onClick);
        return btn;
    }

    getConditionDefinition(type) {
        return this.getConditionDefinitions().find(d => d.type === type);
    }

    getActionDefinition(type) {
        return this.getActionDefinitions().find(d => d.type === type);
    }

    onShow() {
        super.onShow();
        this.renderEventSheet();
    }

    onDestroy() {
        if (this._undoRedoHandler) {
            document.removeEventListener('keydown', this._undoRedoHandler);
        }
        if (this.propertyModal && this.propertyModal.parentNode) {
            this.propertyModal.remove();
        }
        super.onDestroy();
    }
}

// Register globally
window.EventSheetEditor = EventSheetEditor;

// Auto-register with FileBrowser when it's ready
if (typeof window.eventSheetEditorRegistered === 'undefined') {
    window.eventSheetEditorRegistered = true;

    const registerWithFileBrowser = () => {
        if (window.fileBrowser && window.fileBrowser.registerEditorWindow) {
            window.fileBrowser.registerEditorWindow(EventSheetEditor);
        }

        if (window.fileBrowser && window.fileBrowser.fileTypes) {
            // Only register if not already registered
            if (!window.fileBrowser.fileTypes['.esp']) {
                window.fileBrowser.fileTypes['.esp'] = {
                    icon: 'fa-project-diagram',
                    color: '#5b7cb6',
                    onDoubleClick: (file) => {
                        // Open Event Sheet Editor and load the file
                        const editor = new EventSheetEditor();
                        editor.show();

                        // Load the project after a short delay to ensure UI is ready
                        setTimeout(async () => {
                            try {
                                const fileData = await window.fileBrowser.readFile(file.path);
                                const data = JSON.parse(fileData);

                                editor.projectName = data.projectName || 'NewModule';
                                editor.moduleNamespace = data.namespace || 'Custom';
                                editor.moduleDescription = data.description || 'Generated from Event Sheet';
                                editor.events = data.events || [];

                                const nameInput = editor.toolbar.querySelector('input[type="text"]');
                                if (nameInput) nameInput.value = editor.projectName;

                                editor.renderEventSheet();
                                editor.updateCode();
                            } catch (err) {
                                console.error('Failed to load project:', err);
                                alert('Failed to load project: ' + err.message);
                            }
                        }, 100);
                    }
                };
            }
        }
    };

    // Try to register immediately if FileBrowser is already available
    if (window.fileBrowser) {
        registerWithFileBrowser();
    } else {
        // Otherwise wait for page load, but only try once with a shorter timeout
        const checkFileBrowser = () => {
            if (window.fileBrowser) {
                registerWithFileBrowser();
            } else {
                // If still not available after 500ms, try one more time after another 500ms
                setTimeout(() => {
                    if (window.fileBrowser) {
                        registerWithFileBrowser();
                    }
                }, 500);
            }
        };

        if (document.readyState === 'loading') {
            window.addEventListener('load', checkFileBrowser, { once: true });
        } else {
            checkFileBrowser();
        }
    }
}
/**
 * EventSheetEditor - Visual programming system for creating game logic
 * 
 * Features:
 * - Drag and drop events, conditions, and actions
 * - Visual event sheet interface
 * - Real-time JavaScript code generation
 * - Module code export
 * - Project management (save/load)
 * - Nested conditions and actions
 * - Multiple view sizes (small, medium, large)
 */
class EventSheetEditor extends EditorWindow {
    static namespace = "Tools";
    static description = "Visual event-based programming system";
    static iconClass = "fas fa-project-diagram";
    static color = "#2d4a7c";

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

        // UI elements
        this.toolbar = null;
        this.tabContainer = null;
        this.eventSheetTab = null;
        this.codeTab = null;
        this.eventSheetView = null;
        this.codeView = null;
        this.propertyModal = null;
        this.currentTab = 'eventSheet';

        // View size: 'small', 'medium', 'large'
        this.viewSize = 'large';

        // Project data
        this.projectName = "NewModule";
        this.moduleNamespace = "Custom";
        this.moduleDescription = "Generated from Event Sheet";

        this.setupUI();
    }

    setupUI() {
        this.clearContent();
        this.createToolbar();
        this.createTabs();
        this.createEventSheetView();
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
            this.saveProject();
        });

        // Load project button
        const loadBtn = this.createToolbarButton('Load Project', () => {
            this.loadProject();
        });

        // Clear all button
        const clearBtn = this.createToolbarButton('Clear All', () => {
            if (confirm('Are you sure you want to clear all events?')) {
                this.events = [];
                this.renderEventSheet();
                this.updateCode();
            }
        });

        this.toolbar.appendChild(nameLabel);
        this.toolbar.appendChild(nameInput);
        this.toolbar.appendChild(sizeLabel);
        this.toolbar.appendChild(sizeSelect);
        this.toolbar.appendChild(addEventBtn);
        this.toolbar.appendChild(generateBtn);
        this.toolbar.appendChild(copyBtn);
        this.toolbar.appendChild(saveBtn);
        this.toolbar.appendChild(loadBtn);
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
            background: #252525;
            border-bottom: 1px solid #444;
        `;

        this.eventSheetTab = this.createTab('Event Sheet', 'eventSheet');
        this.codeTab = this.createTab('Generated Code', 'code');

        this.tabContainer.appendChild(this.eventSheetTab);
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
        if (this.eventSheetTab) {
            this.eventSheetTab.style.color = tabName === 'eventSheet' ? '#fff' : '#aaa';
            this.eventSheetTab.style.borderBottomColor = tabName === 'eventSheet' ? '#4a7c59' : 'transparent';
            this.eventSheetTab.style.background = tabName === 'eventSheet' ? '#2a2a2a' : 'transparent';
        }

        if (this.codeTab) {
            this.codeTab.style.color = tabName === 'code' ? '#fff' : '#aaa';
            this.codeTab.style.borderBottomColor = tabName === 'code' ? '#4a7c59' : 'transparent';
            this.codeTab.style.background = tabName === 'code' ? '#2a2a2a' : 'transparent';
        }

        // Show/hide views
        if (this.eventSheetView) {
            this.eventSheetView.style.display = tabName === 'eventSheet' ? 'block' : 'none';
        }

        if (this.codeView) {
            this.codeView.style.display = tabName === 'code' ? 'block' : 'none';
        }

        if (tabName === 'code') {
            this.updateCode();
        }
    }

    createEventSheetView() {
        this.eventSheetView = document.createElement('div');
        this.eventSheetView.className = 'event-sheet-view';
        this.eventSheetView.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #1e1e1e;
            min-height: 400px;
        `;

        this.content.appendChild(this.eventSheetView);
        this.renderEventSheet();
    }

    createCodeView() {
        this.codeView = document.createElement('div');
        this.codeView.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #1e1e1e;
            display: none;
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
        `;
        codeTextarea.readOnly = true;

        this.codeView.appendChild(codeTextarea);
        this.content.appendChild(this.codeView);
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
            max-width: 600px;
            z-index: 10000;
            display: none;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;

        document.body.appendChild(this.propertyModal);
    }

    addEvent() {
        const newEvent = {
            id: this.generateId(),
            type: 'event',
            name: 'start',
            conditions: [],
            actions: []
        };

        this.events.push(newEvent);
        this.renderEventSheet();
        this.updateCode();
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
            return;
        }

        this.events.forEach((event, index) => {
            const eventElement = this.createEventElement(event, index);
            this.eventSheetView.appendChild(eventElement);
        });
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

        const eventTitle = document.createElement('select');
        eventTitle.style.cssText = styles.eventTitle;

        const eventTypes = ['start', 'loop', 'draw', 'onDestroy', 'preload', 'beginLoop', 'endLoop'];
        eventTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            option.selected = event.name === type;
            eventTitle.appendChild(option);
        });

        eventTitle.addEventListener('change', (e) => {
            event.name = e.target.value;
            this.updateCode();
        });

        const controls = document.createElement('div');
        controls.style.cssText = 'display: flex; gap: 8px;';

        const deleteBtn = this.createIconButton('🗑️', 'Delete Event', () => {
            this.events.splice(index, 1);
            this.renderEventSheet();
            this.updateCode();
        });

        controls.appendChild(deleteBtn);
        header.appendChild(eventTitle);
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

        // Create a header row with label and add button on the same line
        const headerRow = document.createElement('div');
        headerRow.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        `;

        const sectionLabel = document.createElement('div');
        sectionLabel.textContent = label;
        sectionLabel.style.cssText = styles.sectionLabel + `color: ${color};`;
        headerRow.appendChild(sectionLabel);

        const addBtn = this.createSmallButton(`+ Add ${label.slice(0, -1)}`, () => {
            this.showElementPicker(parentElement, arrayName);
        }, styles.button + `margin-top: 0; background: ${color}33; border-color: ${color};`);
        headerRow.appendChild(addBtn);

        section.appendChild(headerRow);

        const container = document.createElement('div');
        container.className = arrayName + '-container';
        container.dataset.parentId = parentElement.id;
        container.dataset.arrayName = arrayName;
        container.style.cssText = styles.container + `min-height: ${this.viewSize === 'small' ? '20px' : '40px'};`;

        this.makeDropTarget(container, parentElement, arrayName);

        items.forEach((item, itemIndex) => {
            const element = this.createBlockElement(item, parentElement, arrayName, itemIndex, indentLevel, color);
            container.appendChild(element);
        });

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
        
        // Different styling for nested blocks vs regular actions
        const isNestedBlock = def && def.supportsNested;
        
        elementDiv.style.cssText = styles.element + `
        background: ${isCondition ? '#3a3a2a' : '#2a3a2a'};
        border: 1px solid ${isCondition ? '#6a6a4a' : '#4a6a4a'};
        ${isNestedBlock ? 'border-left: 3px solid ' + color + ';' : ''}
    `;

        elementDiv.addEventListener('dragstart', (e) => {
            this.draggedElement = elementDiv;
            this.draggedElement.dragData = {
                item: element,
                sourceParent: parentElement,
                sourceArray: arrayName,
                sourceIndex: index
            };
            elementDiv.style.opacity = '0.5';
        });

        elementDiv.addEventListener('dragend', () => {
            elementDiv.style.opacity = '1';
        });

        elementDiv.addEventListener('mouseenter', () => {
            elementDiv.style.background = isCondition ? '#4a4a3a' : '#3a4a3a';
        });

        elementDiv.addEventListener('mouseleave', () => {
            elementDiv.style.background = isCondition ? '#3a3a2a' : '#2a3a2a';
        });

        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = 'flex: 1; width: 100%;';

        const labelContainer = document.createElement('div');
        labelContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

        // Main label and badge
        const mainLabelContainer = document.createElement('div');
        mainLabelContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1; flex-wrap: wrap;';

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

        // For nested blocks with conditions, show conditions inline in the header
        if (def && def.supportsNestedConditions) {
            // Ensure the array exists
            if (!element.conditions) element.conditions = [];
            
            // Create inline condition display in header
            if (element.conditions.length > 0) {
                const conditionSummary = document.createElement('span');
                conditionSummary.style.cssText = `
                    color: #ffa500;
                    font-size: 11px;
                    font-weight: normal;
                    padding: 2px 8px;
                    background: #3a3a2a;
                    border-radius: 3px;
                    border: 1px solid #ffa500;
                `;
                
                // Build condition summary text
                const conditionTexts = element.conditions.map(cond => {
                    const condDef = this.getConditionDefinition(cond.type);
                    if (!condDef) return '';
                    
                    // For nested blocks, just show the name
                    if (condDef.supportsNested) {
                        return condDef.name;
                    }
                    
                    // For simple conditions, show a compact version
                    let text = condDef.name;
                    if (cond.params && Object.keys(cond.params).length > 0) {
                        const firstParam = Object.values(cond.params).find(v => v !== undefined && v !== null && v !== '');
                        if (firstParam !== undefined) {
                            if (typeof firstParam === 'string') {
                                text += ` "${firstParam}"`;
                            } else {
                                text += ` ${firstParam}`;
                            }
                        }
                    }
                    return text;
                }).filter(t => t).join(' & ');
                
                conditionSummary.textContent = conditionTexts || '(always)';
                conditionSummary.title = 'Conditions: ' + conditionTexts;
                mainLabelContainer.appendChild(conditionSummary);
            } else {
                const alwaysTrue = document.createElement('span');
                alwaysTrue.style.cssText = `
                    color: #888;
                    font-size: 10px;
                    font-style: italic;
                    padding: 2px 6px;
                    background: #2a2a2a;
                    border-radius: 3px;
                `;
                alwaysTrue.textContent = '(always true)';
                mainLabelContainer.appendChild(alwaysTrue);
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
            const nestedContainer = document.createElement('div');
            nestedContainer.style.cssText = styles.nestedContainer + `
                background: #1a1a1a;
                border-radius: 4px;
                padding: 8px;
            `;

            // For condition blocks (like If), add the conditions section
            if (def.supportsNestedConditions) {
                // Ensure the array exists
                if (!element.conditions) element.conditions = [];
                
                // Add nested conditions section
                const nestedConditions = this.createBlockSection(
                    'Conditions',
                    element.conditions,
                    element,
                    'conditions',
                    '#ffa500',
                    0
                );
                nestedContainer.appendChild(nestedConditions);
            }

            if (def.supportsNestedActions) {
                // Ensure the array exists
                if (!element.actions) element.actions = [];
                const nestedActions = this.createBlockSection(
                    'Actions',
                    element.actions,
                    element,
                    'actions',
                    '#4a7c59',
                    0
                );
                nestedContainer.appendChild(nestedActions);
            }

            if (def.supportsElse) {
                // Ensure the array exists
                if (!element.elseActions) element.elseActions = [];
                const elseActions = this.createBlockSection(
                    'Else Actions',
                    element.elseActions,
                    element,
                    'elseActions',
                    '#7c4a4a',
                    0
                );
                nestedContainer.appendChild(elseActions);
            }

            if (nestedContainer.children.length > 0) {
                contentWrapper.appendChild(nestedContainer);
            }
        }

        elementDiv.appendChild(contentWrapper);

        return elementDiv;
    }

    makeDropTarget(container, parentElement, targetArray) {
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            
            // Prevent dropping an item into its own container or into a descendant of itself
            if (this.draggedElement && this.draggedElement.dragData) {
                const draggedItem = this.draggedElement.dragData.item;
                const sourceParent = this.draggedElement.dragData.sourceParent;
                
                // Check if trying to drop into the same parent container
                if (sourceParent === parentElement && this.draggedElement.dragData.sourceArray === targetArray) {
                    // Allow reordering within the same container
                    e.dataTransfer.dropEffect = 'move';
                } else if (this.isDescendantOrSelf(parentElement, draggedItem)) {
                    // Prevent dropping into itself or its descendants
                    e.dataTransfer.dropEffect = 'none';
                    container.style.borderColor = '#ff0000';
                    container.style.background = '#3a2a2a';
                    return;
                } else {
                    e.dataTransfer.dropEffect = 'move';
                }
            }
            
            container.style.borderColor = '#4a7c59';
            container.style.background = '#2a3a2a';
            container.style.transform = 'scale(1.01)';
        });

        container.addEventListener('dragleave', () => {
            container.style.borderColor = '#555';
            container.style.background = '#252525';
            container.style.transform = 'scale(1)';
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.style.borderColor = '#555';
            container.style.background = '#252525';
            container.style.transform = 'scale(1)';

            if (this.draggedElement && this.draggedElement.dragData) {
                const dragData = this.draggedElement.dragData;

                // Prevent dropping into itself or its descendants
                if (this.isDescendantOrSelf(parentElement, dragData.item)) {
                    console.warn('Cannot drop a block into itself or its children');
                    this.draggedElement = null;
                    return;
                }

                // Remove from old location
                if (dragData.sourceParent && dragData.sourceArray) {
                    const sourceArr = dragData.sourceParent[dragData.sourceArray];
                    const idx = sourceArr.findIndex(item => item.id === dragData.item.id);
                    if (idx !== -1) {
                        sourceArr.splice(idx, 1);
                    }
                }

                // Add to new location
                if (!parentElement[targetArray]) {
                    parentElement[targetArray] = [];
                }
                parentElement[targetArray].push(dragData.item);

                this.draggedElement = null;
                this.renderEventSheet();
                this.updateCode();
            }
        });
    }

    // Helper method to check if targetParent is the draggedItem itself or a descendant of it
    isDescendantOrSelf(targetParent, draggedItem) {
        if (!targetParent || !draggedItem) return false;
        
        // Check if target parent IS the dragged item itself
        if (targetParent.id === draggedItem.id) {
            return true;
        }
        
        // Recursively check if targetParent is nested inside the dragged item
        return this.containsElement(draggedItem, targetParent);
    }

    containsElement(element, target) {
        if (!element || !target) return false;
        
        // Check conditions array
        if (element.conditions && Array.isArray(element.conditions)) {
            for (const cond of element.conditions) {
                if (cond === target || cond.id === target.id || this.containsElement(cond, target)) {
                    return true;
                }
            }
        }
        
        // Check actions array
        if (element.actions && Array.isArray(element.actions)) {
            for (const action of element.actions) {
                if (action === target || action.id === target.id || this.containsElement(action, target)) {
                    return true;
                }
            }
        }
        
        // Check elseActions array
        if (element.elseActions && Array.isArray(element.elseActions)) {
            for (const elseAction of element.elseActions) {
                if (elseAction === target || elseAction.id === target.id || this.containsElement(elseAction, target)) {
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

        this.propertyModal.innerHTML = '';
        this.propertyModal.style.display = 'block';

        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        titleEl.style.cssText = 'margin: 0 0 15px 0; color: #fff;';
        this.propertyModal.appendChild(titleEl);

        const list = document.createElement('div');
        list.style.cssText = `
        max-height: 400px;
        overflow-y: auto;
        margin-bottom: 15px;
    `;

        definitions.forEach(def => {
            const item = document.createElement('div');
            item.style.cssText = `
            padding: 10px;
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
        `;

            item.addEventListener('mouseenter', () => {
                item.style.background = '#444';
                item.style.borderColor = '#4a7c59';
            });

            item.addEventListener('mouseleave', () => {
                item.style.background = '#333';
                item.style.borderColor = '#555';
            });

            const itemTitle = document.createElement('div');
            itemTitle.textContent = def.name;
            itemTitle.style.cssText = 'color: #fff; font-weight: bold; margin-bottom: 4px;';

            const itemDesc = document.createElement('div');
            itemDesc.textContent = def.description || '';
            itemDesc.style.cssText = 'color: #aaa; font-size: 11px;';

            item.appendChild(itemTitle);
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

    editElement(element, parentElement, targetArray, index) {
        // Try to find definition in both conditions and actions
        let definition = null;

        if (targetArray === 'conditions' || targetArray.includes('conditions')) {
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

        const title = document.createElement('h3');
        title.textContent = `Edit ${definition.name}`;
        title.style.cssText = 'margin: 0 0 15px 0; color: #fff;';
        this.propertyModal.appendChild(title);

        const form = document.createElement('div');
        form.style.cssText = 'margin-bottom: 15px;';

        const inputs = {};

        if (definition.inputs && definition.inputs.length > 0) {
            definition.inputs.forEach(input => {
                const field = this.createInputField(input, element.params[input.name]);
                form.appendChild(field.container);
                inputs[input.name] = field.input;
            });
        } else {
            const noParams = document.createElement('div');
            noParams.textContent = 'No parameters to configure';
            noParams.style.cssText = 'color: #888; font-style: italic; margin-bottom: 10px;';
            form.appendChild(noParams);
        }

        this.propertyModal.appendChild(form);

        const buttons = document.createElement('div');
        buttons.style.cssText = 'display: flex; gap: 10px;';

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
                if (!parentElement[targetArray]) {
                    parentElement[targetArray] = [];
                }
                parentElement[targetArray].push(element);
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

    createInputField(inputDef, value) {
        const container = document.createElement('div');
        container.style.cssText = 'margin-bottom: 12px;';

        const label = document.createElement('label');
        label.textContent = inputDef.label || inputDef.name;
        label.style.cssText = 'display: block; color: #fff; margin-bottom: 6px; font-size: 13px;';
        container.appendChild(label);

        let input;

        if (inputDef.type === 'boolean') {
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
        } else if (inputDef.options) {
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

        if (inputDef.description) {
            const desc = document.createElement('div');
            desc.textContent = inputDef.description;
            desc.style.cssText = 'color: #888; font-size: 11px; margin-top: 4px;';
            container.appendChild(desc);
        }

        container.appendChild(input);

        return { container, input };
    }

    getConditionDefinitions() {
        return [
            {
                type: 'ifCondition',
                name: 'If',
                description: 'Create a nested if statement with conditions and actions',
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
                            code += `${indent}if (${conditionCodes.join(' && ')}) {\n`;

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
                inputs: [
                    { name: 'key', type: 'string', label: 'Key', description: 'Key to check (e.g., "w", "space", "shift")' }
                ],
                toJavascriptCode: (params) => `window.input.keyDown("${params.key || ''}")`
            },
            {
                type: 'keyPressed',
                name: 'Key Pressed',
                description: 'Check if a key was just pressed this frame',
                inputs: [
                    { name: 'key', type: 'string', label: 'Key', description: 'Key to check' }
                ],
                toJavascriptCode: (params) => `window.input.keyPressed("${params.key || ''}")`
            },
            {
                type: 'mouseDown',
                name: 'Mouse Down',
                description: 'Check if a mouse button is pressed',
                inputs: [
                    { name: 'button', type: 'string', label: 'Button', options: ['left', 'right', 'middle'], default: 'left' }
                ],
                toJavascriptCode: (params) => `window.input.mouseDown("${params.button || 'left'}")`
            },
            {
                type: 'compareNumber',
                name: 'Compare',
                description: 'Compare a property with a value',
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
                type: 'customCondition',
                name: 'Custom',
                description: 'Write custom JavaScript condition',
                inputs: [
                    { name: 'code', type: 'string', label: 'Code' }
                ],
                toJavascriptCode: (params) => params.code || 'true'
            }
        ];
    }

    getActionDefinitions() {
        return [
            {
                type: 'nestedBlock',
                name: 'Block',
                description: 'Create a block that can contain nested actions',
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
                            const def = this.getActionDefinition(action.type) || this.getConditionDefinition(action.type);
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
                inputs: [
                    { name: 'angle', type: 'number', label: 'Angle', default: 0 }
                ],
                toJavascriptCode: (params, element, indent = '') => `${indent}this.gameObject.angle = ${params.angle || 0};`
            },
            {
                type: 'rotate',
                name: 'Rotate',
                description: 'Rotate the GameObject',
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
                inputs: [
                    { name: 'property', type: 'string', label: 'Property' },
                    { name: 'value', type: 'string', label: 'Value' }
                ],
                toJavascriptCode: (params, element, indent = '') =>
                    `${indent}${params.property || 'this.value'} = ${params.value || 0};`
            },
            {
                type: 'log',
                name: 'Log',
                description: 'Log a message to console',
                inputs: [
                    { name: 'message', type: 'string', label: 'Message' }
                ],
                toJavascriptCode: (params, element, indent = '') => `${indent}console.log("${params.message || ''}");`
            },
            {
                type: 'customAction',
                name: 'Custom Code',
                description: 'Write custom JavaScript',
                inputs: [
                    { name: 'code', type: 'string', label: 'Code' }
                ],
                toJavascriptCode: (params, element, indent = '') => `${indent}${params.code || '// Custom code'}`
            }
        ];
    }

    showElementPicker(parentElement, targetArray) {
        // Allow adding conditions to actions section for nested if blocks
        const isActionSection = targetArray === 'actions' || targetArray === 'elseActions';
        const definitions = isActionSection ?
            [...this.getConditionDefinitions().filter(d => d.supportsNested), ...this.getActionDefinitions()] :
            this.getConditionDefinitions();

        this.propertyModal.innerHTML = '';
        this.propertyModal.style.display = 'block';

        const title = document.createElement('h3');
        title.textContent = isActionSection ? 'Select Action or Condition Block' : 'Select Condition';
        title.style.cssText = 'margin: 0 0 15px 0; color: #fff;';
        this.propertyModal.appendChild(title);

        const list = document.createElement('div');
        list.style.cssText = `
        max-height: 400px;
        overflow-y: auto;
        margin-bottom: 15px;
    `;

        definitions.forEach(def => {
            const item = document.createElement('div');
            item.style.cssText = `
            padding: 10px;
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
        `;

            item.addEventListener('mouseenter', () => {
                item.style.background = '#444';
                item.style.borderColor = '#4a7c59';
            });

            item.addEventListener('mouseleave', () => {
                item.style.background = '#333';
                item.style.borderColor = '#555';
            });

            const itemTitle = document.createElement('div');
            itemTitle.textContent = def.name;
            itemTitle.style.cssText = 'color: #fff; font-weight: bold; margin-bottom: 4px;';

            const itemDesc = document.createElement('div');
            itemDesc.textContent = def.description || '';
            itemDesc.style.cssText = 'color: #aaa; font-size: 11px;';

            item.appendChild(itemTitle);
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

    updateCode() {
        const code = this.generateModuleCode();
        const textarea = this.codeView.querySelector('.generated-code');
        if (textarea) {
            textarea.value = code;
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
        code += `        // Custom properties\n`;
        code += `        // Add your properties here\n`;
        code += `    }\n\n`;

        // Generate event methods
        this.events.forEach(event => {
            code += this.generateEventCode(event);
        });

        code += `    toJSON() {\n`;
        code += `        return {\n`;
        code += `            ...super.toJSON(),\n`;
        code += `            // Add custom properties to save\n`;
        code += `        };\n`;
        code += `    }\n\n`;

        code += `    fromJSON(data) {\n`;
        code += `        super.fromJSON(data);\n`;
        code += `        if (!data) return;\n`;
        code += `        // Load custom properties\n`;
        code += `    }\n`;
        code += `}\n\n`;
        code += `window.${className} = ${className};`;

        return code;
    }

    generateEventCode(event) {
        let code = `    ${event.name}(`;

        // Add parameters based on event type
        if (event.name === 'loop' || event.name === 'beginLoop' || event.name === 'endLoop') {
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
        const def = type === 'conditions' ?
            this.getConditionDefinition(element.type) :
            this.getActionDefinition(element.type);

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
        if (this.propertyModal && this.propertyModal.parentNode) {
            this.propertyModal.remove();
        }
        super.onDestroy();
    }
}

// Register globally
window.EventSheetEditor = EventSheetEditor;

// Auto-register with FileBrowser when it's ready
window.addEventListener('load', () => {
    // Wait a bit for FileBrowser to initialize
    setTimeout(() => {
        if (window.fileBrowser && window.fileBrowser.registerEditorWindow) {
            window.fileBrowser.registerEditorWindow(EventSheetEditor);
        }
    }, 1000);
});
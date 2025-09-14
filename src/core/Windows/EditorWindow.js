/**
 * EditorWindow - Base class for creating closable modal workspace tools
 * 
 * This class provides a foundation for creating custom editor windows with:
 * - Modal dialog functionality
 * - Property exposure system for Inspector integration
 * - Component management (buttons, inputs, etc.)
 * - Event handling (onChange, onClick, etc.)
 * - Styling and layout management
 * - File system integration
 * - Window layering and dragging
 * 
 * @example
 * class MyCustomTool extends EditorWindow {
 *   constructor() {
 *     super("My Custom Tool", { width: 800, height: 600 });
 *     this.setupUI();
 *   }
 * }
 */
class EditorWindow {
    // Static z-index counter for layering windows
    static zIndexCounter = 1001;
    static activeWindows = new Set();

    /**
     * Create a new EditorWindow
     * @param {string} title - Window title
     * @param {Object} options - Configuration options
     * @param {number} options.width - Window width (default: 600)
     * @param {number} options.height - Window height (default: 400)
     * @param {boolean} options.resizable - Whether window is resizable (default: true)
     * @param {boolean} options.modal - Whether window is modal (default: false)
     * @param {boolean} options.closable - Whether window can be closed (default: true)
     * @param {string} options.className - Additional CSS class for styling
     */
    constructor(title = "Editor Window", options = {}) {
        this.title = title;
        this.options = {
            width: 600,
            height: 400,
            resizable: true,
            modal: false, // Changed default to false for better UX
            closable: true,
            className: '',
            ...options
        };

        // Error handling
        this.hasError = false;
        this.errorMessage = '';

        // State management
        this.isOpen = false;
        this.isMinimized = false;
        this.properties = new Map(); // Exposed properties
        this.components = new Map(); // UI components
        this.eventHandlers = new Map(); // Event handlers

        // DOM elements
        this.overlay = null;
        this.window = null;
        this.header = null;
        this.content = null;
        this.footer = null;

        // Position and size
        this.position = { x: 0, y: 0 };
        this.size = { width: this.options.width, height: this.options.height };

        // Z-index for layering
        this.zIndex = EditorWindow.zIndexCounter++;

        // Create the window but don't show it yet
        this.createWindow();
    }

    /**
     * Create the window DOM structure
     * @private
     */
    createWindow() {
        try {
            // Create overlay if modal
            if (this.options.modal) {
                this.overlay = document.createElement('div');
                this.overlay.className = 'editor-window-overlay';
                this.overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.5);
                z-index: ${this.zIndex - 1};
                display: none;
                align-items: center;
                justify-content: center;
            `;
            }

            // Create main window
            this.window = document.createElement('div');
            this.window.className = `editor-window ${this.options.className}`;
            this.window.style.cssText = `
            position: ${this.options.modal ? 'relative' : 'fixed'};
            width: ${this.size.width}px;
            height: ${this.size.height}px;
            background: #2d2d2d;
            border: 1px solid #555;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            z-index: ${this.zIndex};
        `;

            if (!this.options.modal) {
                this.window.style.left = `${this.position.x}px`;
                this.window.style.top = `${this.position.y}px`;
            }

            // Create header
            this.createHeader();

            // Create content area
            this.content = document.createElement('div');
            this.content.className = 'editor-window-content';
            this.content.style.cssText = `
            flex: 1;
            padding: 16px;
            overflow: auto;
            background: #1e1e1e;
            color: #ffffff;
        `;

            // Create footer (optional)
            this.footer = document.createElement('div');
            this.footer.className = 'editor-window-footer';
            this.footer.style.cssText = `
            padding: 12px 16px;
            background: #2d2d2d;
            border-top: 1px solid #555;
            display: none;
        `;

            // Assemble window
            this.window.appendChild(this.header);
            this.window.appendChild(this.content);
            this.window.appendChild(this.footer);

            if (this.options.modal && this.overlay) {
                this.overlay.appendChild(this.window);
                document.body.appendChild(this.overlay);
            } else {
                document.body.appendChild(this.window);
            }

            // Setup event listeners
            this.setupEventListeners();
        } catch (error) {
            this.handleError(error, 'Failed to create window');
        }
    }

    /**
     * Create the window header with title and controls
     * @private
     */
    createHeader() {
        try {
            this.header = document.createElement('div');
            this.header.className = 'editor-window-header';
            this.header.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #3d3d3d;
            border-bottom: 1px solid #555;
            cursor: move;
            user-select: none;
        `;

            // Title
            const titleElement = document.createElement('h3');
            titleElement.textContent = this.title;
            titleElement.style.cssText = `
            margin: 0;
            color: #ffffff;
            font-size: 14px;
            font-weight: 600;
            pointer-events: none;
        `;

            // Controls container
            const controls = document.createElement('div');
            controls.className = 'editor-window-controls';
            controls.style.cssText = `
            display: flex;
            gap: 8px;
        `;

            // Minimize button
            if (!this.options.modal) {
                const minimizeBtn = this.createControlButton('−', 'Minimize');
                minimizeBtn.addEventListener('click', () => this.minimize());
                controls.appendChild(minimizeBtn);
            }

            // Close button
            if (this.options.closable) {
                const closeBtn = this.createControlButton('×', 'Close');
                closeBtn.addEventListener('click', () => this.close());
                controls.appendChild(closeBtn);
            }

            this.header.appendChild(titleElement);
            this.header.appendChild(controls);
        } catch (error) {
            this.handleError(error, 'Failed to setup event listeners');
        }
    }

    /**
     * Create a control button for the header
     * @private
     */
    createControlButton(text, title) {
        const button = document.createElement('button');
        button.textContent = text;
        button.title = title;
        button.style.cssText = `
            width: 24px;
            height: 24px;
            border: none;
            background: #555;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            line-height: 1;
            pointer-events: auto;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.background = '#666';
        });

        button.addEventListener('mouseleave', () => {
            button.style.background = '#555';
        });

        return button;
    }

    /**
     * Setup event listeners for window functionality
     * @private
     */
    setupEventListeners() {
        try {
            // Window dragging - works for both modal and non-modal
            let isDragging = false;
            let dragStart = { x: 0, y: 0 };

            this.header.addEventListener('mousedown', (e) => {
                // Don't drag if clicking on buttons
                if (e.target.tagName === 'BUTTON') return;

                isDragging = true;
                this.bringToFront();

                // Get current position
                const rect = this.window.getBoundingClientRect();
                dragStart = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };

                document.body.style.cursor = 'move';
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const newX = e.clientX - dragStart.x;
                const newY = e.clientY - dragStart.y;

                // Keep window within viewport bounds
                const maxX = window.innerWidth - this.size.width;
                const maxY = window.innerHeight - this.size.height;

                this.position.x = Math.max(0, Math.min(maxX, newX));
                this.position.y = Math.max(0, Math.min(maxY, newY));

                if (this.options.modal && this.overlay) {
                    // For modal windows, position relative to overlay
                    this.window.style.position = 'fixed';
                    this.window.style.left = `${this.position.x}px`;
                    this.window.style.top = `${this.position.y}px`;
                } else {
                    this.window.style.left = `${this.position.x}px`;
                    this.window.style.top = `${this.position.y}px`;
                }
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    document.body.style.cursor = '';
                }
            });

            // Click to bring to front
            this.window.addEventListener('mousedown', () => {
                this.bringToFront();
            });

            // Window resizing
            if (this.options.resizable) {
                this.setupResizing();
            }

            // Escape key to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen && this.options.closable) {
                    this.close();
                }
            });
        } catch (error) {
            this.handleError(error, 'Failed to setup event listeners');
        }

        // Make sure close button always works by wrapping it in try-catch
        const originalClose = this.close.bind(this);
        this.close = () => {
            try {
                originalClose();
            } catch (error) {
                // Force close even if there's an error
                this.hide();
                console.error('Error during window close:', error);
            }
        };
    }

    /**
     * Bring this window to the front
     */
    bringToFront() {
        this.zIndex = EditorWindow.zIndexCounter++;

        if (this.options.modal && this.overlay) {
            this.overlay.style.zIndex = this.zIndex - 1;
        }
        this.window.style.zIndex = this.zIndex;
    }

    /**
     * Setup window resizing functionality
     * @private
     */
    setupResizing() {
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'editor-window-resize-handle';
        resizeHandle.style.cssText = `
            position: absolute;
            bottom: 0;
            right: 0;
            width: 16px;
            height: 16px;
            cursor: se-resize;
            background: linear-gradient(-45deg, transparent 0%, transparent 46%, #666 46%, #666 54%, transparent 54%);
        `;

        this.window.appendChild(resizeHandle);

        let isResizing = false;
        let resizeStart = { x: 0, y: 0, width: 0, height: 0 };

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            this.bringToFront();
            resizeStart = {
                x: e.clientX,
                y: e.clientY,
                width: this.size.width,
                height: this.size.height
            };
            document.body.style.cursor = 'se-resize';
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const newWidth = Math.max(300, resizeStart.width + (e.clientX - resizeStart.x));
            const newHeight = Math.max(200, resizeStart.height + (e.clientY - resizeStart.y));

            this.resize(newWidth, newHeight);
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
            }
        });
    }

    /**
     * Show the window
     */
    show() {
        try {
            if (this.isOpen) return;

            this.isOpen = true;
            EditorWindow.activeWindows.add(this);

            if (this.options.modal && this.overlay) {
                this.overlay.style.display = 'flex';
            } else {
                this.window.style.display = 'flex';
            }

            // Center window initially
            this.centerWindow();
            this.bringToFront();

            // Trigger show event
            this.onShow();
        } catch (error) {
            this.handleError(error, 'Failed to show window');
        }
    }

    /**
     * Hide the window
     */
    hide() {
        if (!this.isOpen) return;

        this.isOpen = false;
        EditorWindow.activeWindows.delete(this);

        if (this.options.modal && this.overlay) {
            this.overlay.style.display = 'none';
        } else {
            this.window.style.display = 'none';
        }

        // Trigger hide event
        this.onHide();
    }

    /**
     * Close the window (calls hide and triggers close event)
     */
    close() {
        if (!this.isOpen) return;

        // Trigger close event (can be cancelled)
        if (this.onBeforeClose() === false) {
            return;
        }

        this.hide();
        this.onClose();
    }

    /**
     * Minimize the window (non-modal only)
     */
    minimize() {
        if (this.options.modal) return;

        this.isMinimized = !this.isMinimized;

        if (this.isMinimized) {
            this.window.style.height = `${this.header.offsetHeight}px`;
            this.content.style.display = 'none';
            this.footer.style.display = 'none';
        } else {
            this.window.style.height = `${this.size.height}px`;
            this.content.style.display = 'block';
            if (this.footer.children.length > 0) {
                this.footer.style.display = 'block';
            }
        }

        this.onMinimize(this.isMinimized);
    }

    /**
     * Resize the window
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resize(width, height) {
        this.size.width = width;
        this.size.height = height;
        this.window.style.width = `${width}px`;
        this.window.style.height = `${height}px`;

        this.onResize(width, height);
    }

    /**
     * Center the window in the viewport
     */
    centerWindow() {
        this.position.x = (window.innerWidth - this.size.width) / 2;
        this.position.y = (window.innerHeight - this.size.height) / 2;

        if (this.options.modal && this.overlay) {
            this.window.style.position = 'fixed';
            this.window.style.left = `${this.position.x}px`;
            this.window.style.top = `${this.position.y}px`;
        } else {
            this.window.style.left = `${this.position.x}px`;
            this.window.style.top = `${this.position.y}px`;
        }
    }

    /**
     * Destroy the window and clean up
     */
    destroy() {
        this.hide();

        if (this.overlay) {
            document.body.removeChild(this.overlay);
        } else {
            document.body.removeChild(this.window);
        }

        this.onDestroy();
    }

    // === COMPONENT API ===

    /**
     * Add a button component to the window
     * @param {string} id - Component ID
     * @param {string} text - Button text
     * @param {Object} options - Button options
     * @param {Function} options.onClick - Click handler
     * @param {string} options.className - Additional CSS class
     * @param {string} options.style - Additional CSS styles
     * @returns {HTMLButtonElement} The created button
     */
    addButton(id, text, options = {}) {
        try {
            const button = document.createElement('button');
            button.id = id;
            button.textContent = text;
            button.className = `editor-window-button ${options.className || ''}`;

            button.style.cssText = `
            padding: 8px 16px;
            background: #0078d4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin: 4px;
            ${options.style || ''}
        `;

            button.addEventListener('mouseenter', () => {
                button.style.background = '#106ebe';
            });

            button.addEventListener('mouseleave', () => {
                button.style.background = '#0078d4';
            });

            if (options.onClick) {
                button.addEventListener('click', options.onClick);
            }

            this.components.set(id, button);
            return button;
        } catch (error) {
            this.handleError(error, 'Failed to add button');
            return null;
        }
    }

    /**
     * Add an input component to the window
     * @param {string} id - Component ID
     * @param {string} label - Input label
     * @param {Object} options - Input options
     * @param {string} options.type - Input type (text, number, etc.)
     * @param {any} options.value - Initial value
     * @param {Function} options.onChange - Change handler
     * @param {string} options.placeholder - Placeholder text
     * @returns {HTMLInputElement} The created input
     */
    addInput(id, label, options = {}) {
        try {
            const container = document.createElement('div');
            container.className = 'editor-window-input-group';
            container.style.cssText = `
            margin: 8px 0;
            display: flex;
            flex-direction: column;
        `;

            if (label) {
                const labelElement = document.createElement('label');
                labelElement.textContent = label;
                labelElement.style.cssText = `
                color: #ffffff;
                font-size: 12px;
                margin-bottom: 4px;
                font-weight: 500;
            `;
                container.appendChild(labelElement);
            }

            const input = document.createElement('input');
            input.id = id;
            input.type = options.type || 'text';
            input.value = options.value || '';
            input.placeholder = options.placeholder || '';
            input.className = 'editor-window-input';

            input.style.cssText = `
            padding: 8px;
            background: #3d3d3d;
            border: 1px solid #555;
            border-radius: 4px;
            color: #ffffff;
            font-size: 14px;
        `;

            input.addEventListener('focus', () => {
                input.style.borderColor = '#0078d4';
            });

            input.addEventListener('blur', () => {
                input.style.borderColor = '#555';
            });

            if (options.onChange) {
                input.addEventListener('input', (e) => options.onChange(e.target.value));
            }

            container.appendChild(input);
            this.components.set(id, input);
            return input;
        } catch (error) {
            this.handleError(error, 'Failed to add input');
            return null;
        }
    }

    /**
     * Add a textarea component to the window
     * @param {string} id - Component ID
     * @param {string} label - Textarea label
     * @param {Object} options - Textarea options
     * @returns {HTMLTextAreaElement} The created textarea
     */
    addTextArea(id, label, options = {}) {
        try {
            const container = document.createElement('div');
            container.className = 'editor-window-textarea-group';
            container.style.cssText = `
            margin: 8px 0;
            display: flex;
            flex-direction: column;
        `;

            if (label) {
                const labelElement = document.createElement('label');
                labelElement.textContent = label;
                labelElement.style.cssText = `
                color: #ffffff;
                font-size: 12px;
                margin-bottom: 4px;
                font-weight: 500;
            `;
                container.appendChild(labelElement);
            }

            const textarea = document.createElement('textarea');
            textarea.id = id;
            textarea.value = options.value || '';
            textarea.placeholder = options.placeholder || '';
            textarea.rows = options.rows || 4;
            textarea.className = 'editor-window-textarea';

            textarea.style.cssText = `
            padding: 8px;
            background: #3d3d3d;
            border: 1px solid #555;
            border-radius: 4px;
            color: #ffffff;
            font-size: 14px;
            resize: vertical;
            font-family: 'Consolas', 'Monaco', monospace;
        `;

            textarea.addEventListener('focus', () => {
                textarea.style.borderColor = '#0078d4';
            });

            textarea.addEventListener('blur', () => {
                textarea.style.borderColor = '#555';
            });

            if (options.onChange) {
                textarea.addEventListener('input', (e) => options.onChange(e.target.value));
            }

            container.appendChild(textarea);
            this.components.set(id, textarea);
            return textarea;
        } catch (error) {
            this.handleError(error, 'Failed to add input');
            return null;
        }
    }

    /**
     * Add a checkbox component to the window
     * @param {string} id - Component ID
     * @param {string} label - Checkbox label
     * @param {Object} options - Checkbox options
     * @returns {HTMLInputElement} The created checkbox
     */
    addCheckbox(id, label, options = {}) {
        try {
            const container = document.createElement('div');
            container.className = 'editor-window-checkbox-group';
            container.style.cssText = `
            margin: 8px 0;
            display: flex;
            align-items: center;
        `;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = id;
            checkbox.checked = options.checked || false;
            checkbox.className = 'editor-window-checkbox';

            checkbox.style.cssText = `
            margin-right: 8px;
            transform: scale(1.2);
        `;

            if (options.onChange) {
                checkbox.addEventListener('change', (e) => options.onChange(e.target.checked));
            }

            const labelElement = document.createElement('label');
            labelElement.textContent = label;
            labelElement.htmlFor = id;
            labelElement.style.cssText = `
            color: #ffffff;
            font-size: 14px;
            cursor: pointer;
        `;

            container.appendChild(checkbox);
            container.appendChild(labelElement);
            this.components.set(id, checkbox);
            return checkbox;
        } catch (error) {
            this.handleError(error, 'Failed to add input');
            return null;
        }
    }

    /**
     * Add a dropdown/select component to the window
     * @param {string} id - Component ID
     * @param {string} label - Select label
     * @param {Array} options - Array of {value, text} objects
     * @param {Object} config - Select configuration
     * @returns {HTMLSelectElement} The created select
     */
    addSelect(id, label, options = [], config = {}) {
        try {
            const container = document.createElement('div');
            container.className = 'editor-window-select-group';
            container.style.cssText = `
            margin: 8px 0;
            display: flex;
            flex-direction: column;
        `;

            if (label) {
                const labelElement = document.createElement('label');
                labelElement.textContent = label;
                labelElement.style.cssText = `
                color: #ffffff;
                font-size: 12px;
                margin-bottom: 4px;
                font-weight: 500;
            `;
                container.appendChild(labelElement);
            }

            const select = document.createElement('select');
            select.id = id;
            select.className = 'editor-window-select';

            select.style.cssText = `
            padding: 8px;
            background: #3d3d3d;
            border: 1px solid #555;
            border-radius: 4px;
            color: #ffffff;
            font-size: 14px;
        `;

            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                select.appendChild(optionElement);
            });

            if (config.value) {
                select.value = config.value;
            }

            if (config.onChange) {
                select.addEventListener('change', (e) => config.onChange(e.target.value));
            }

            container.appendChild(select);
            this.components.set(id, select);
            return select;
        } catch (error) {
            this.handleError(error, 'Failed to add input');
            return null;
        }
    }

    /**
     * Get a component by ID
     * @param {string} id - Component ID
     * @returns {HTMLElement} The component element
     */
    getComponent(id) {
        return this.components.get(id);
    }

    /**
     * Remove a component by ID
     * @param {string} id - Component ID
     */
    removeComponent(id) {
        const component = this.components.get(id);
        if (component && component.parentNode) {
            component.parentNode.removeChild(component);
            this.components.delete(id);
        }
    }

    /**
     * Add content to the window body
     * @param {HTMLElement|string} content - Content to add
     */
    addContent(content) {
        if (typeof content === 'string') {
            const div = document.createElement('div');
            div.innerHTML = content;
            this.content.appendChild(div);
        } else {
            this.content.appendChild(content);
        }
    }

    /**
     * Clear all content from the window
     */
    clearContent() {
        this.content.innerHTML = '';
        this.components.clear();
    }

    // === PROPERTY EXPOSURE API ===

    /**
     * Expose a property for Inspector integration
     * @param {string} name - Property name
     * @param {string} type - Property type (number, string, boolean, etc.)
     * @param {any} value - Initial value
     * @param {Object} options - Property options
     * @param {Function} options.onChange - Change handler
     * @param {Function} options.onClick - Click handler (for buttons)
     * @param {string} options.description - Property description
     * @param {number} options.min - Minimum value (for numbers)
     * @param {number} options.max - Maximum value (for numbers)
     * @param {number} options.step - Step value (for numbers)
     */
    exposeProperty(name, type, value, options = {}) {
        this.properties.set(name, {
            name,
            type,
            value,
            options
        });

        // Set the actual property on this object
        Object.defineProperty(this, name, {
            get: () => this.properties.get(name).value,
            set: (newValue) => {
                const prop = this.properties.get(name);
                const oldValue = prop.value;
                prop.value = newValue;

                // Trigger change handler
                if (options.onChange) {
                    options.onChange(newValue, oldValue);
                }
            },
            enumerable: true,
            configurable: true
        });
    }

    /**
     * Get all exposed properties
     * @returns {Map} Map of exposed properties
     */
    getExposedProperties() {
        return this.properties;
    }

    /**
     * Update a property value
     * @param {string} name - Property name
     * @param {any} value - New value
     */
    updateProperty(name, value) {
        if (this.properties.has(name)) {
            this[name] = value; // Use the setter to trigger events
        }
    }

    // === FILE SYSTEM INTEGRATION ===

    /**
     * Save window data to a file
     * @param {string} filePath - File path to save to
     * @returns {Promise<boolean>} Success indicator
     */
    async saveToFile(filePath) {
        try {
            const data = this.serialize();

            if (window.fileBrowser) {
                const success = await window.fileBrowser.writeFile(filePath, JSON.stringify(data, null, 2));
                if (success) {
                    this.onSave(filePath);
                }
                return success;
            }
            return false;
        } catch (error) {
            console.error('Error saving window data:', error);
            return false;
        }
    }

    /**
     * Load window data from a file
     * @param {string} filePath - File path to load from
     * @returns {Promise<boolean>} Success indicator
     */
    async loadFromFile(filePath) {
        try {
            if (window.fileBrowser) {
                const content = await window.fileBrowser.readFile(filePath);
                if (content) {
                    const data = JSON.parse(content);
                    this.deserialize(data);
                    this.onLoad(filePath);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error loading window data:', error);
            return false;
        }
    }

    /**
     * Serialize window data to JSON
     * @returns {Object} Serialized data
     */
    serialize() {
        const data = {
            title: this.title,
            position: this.position,
            size: this.size,
            properties: {}
        };

        // Serialize exposed properties
        this.properties.forEach((prop, name) => {
            data.properties[name] = prop.value;
        });

        return data;
    }

    /**
     * Deserialize window data from JSON
     * @param {Object} data - Data to deserialize
     */
    deserialize(data) {
        if (data.title) this.title = data.title;
        if (data.position) this.position = data.position;
        if (data.size) {
            this.size = data.size;
            this.resize(data.size.width, data.size.height);
        }

        // Restore properties
        if (data.properties) {
            Object.entries(data.properties).forEach(([name, value]) => {
                if (this.properties.has(name)) {
                    this.updateProperty(name, value);
                }
            });
        }
    }

    /**
     * Handle errors and display them in the window
     * @param {Error} error - The error that occurred
     * @param {string} context - Context where the error occurred
     */
    handleError(error, context = 'An error occurred') {
        this.hasError = true;
        this.errorMessage = `${context}: ${error.message}`;

        console.error(context, error);

        // Clear content and show error
        this.content.innerHTML = '';

        const errorContainer = document.createElement('div');
        errorContainer.className = 'editor-window-error';
        errorContainer.style.cssText = `
            padding: 16px;
            background: #4a1a1a;
            border: 1px solid #ff4444;
            border-radius: 4px;
            color: #ff9999;
            font-family: 'Consolas', monospace;
            white-space: pre-wrap;
            overflow: auto;
        `;

        errorContainer.innerHTML = `
            <div style="color: #ff4444; font-weight: bold; margin-bottom: 8px;">
                ⚠ ${context}
            </div>
            <div style="margin-bottom: 12px;">
                ${error.message}
            </div>
            <div style="font-size: 12px; color: #cc8888;">
                ${error.stack || 'No stack trace available'}
            </div>
        `;

        this.content.appendChild(errorContainer);

        // Add retry button if the window isn't open yet
        if (!this.isOpen) {
            const retryBtn = document.createElement('button');
            retryBtn.textContent = 'Retry';
            retryBtn.style.cssText = `
                margin-top: 12px;
                padding: 8px 16px;
                background: #0078d4;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;
            retryBtn.onclick = () => this.clearError();
            errorContainer.appendChild(retryBtn);
        }
    }

    /**
     * Clear error state and restore normal functionality
     */
    clearError() {
        this.hasError = false;
        this.errorMessage = '';
        this.content.innerHTML = '';
    }

    /**
     * Wrap method calls in error handling
     * @private
     */
    safeCall(methodName, ...args) {
        try {
            return this[methodName](...args);
        } catch (error) {
            this.handleError(error, `Error in ${methodName}`);
            return null;
        }
    }

    // === EVENT HANDLERS (Override in subclasses) ===

    /**
     * Called when the window is shown
     */
    onShow() { }

    /**
     * Called when the window is hidden
     */
    onHide() { }

    /**
     * Called before the window is closed (return false to cancel)
     * @returns {boolean} Whether to continue with close
     */
    onBeforeClose() {
        return true;
    }

    /**
     * Called when the window is closed
     */
    onClose() { }

    /**
     * Called when the window is minimized/restored
     * @param {boolean} isMinimized - Whether the window is minimized
     */
    onMinimize(isMinimized) { }

    /**
     * Called when the window is resized
     * @param {number} width - New width
     * @param {number} height - New height
     */
    onResize(width, height) { }

    /**
     * Called when the window is destroyed
     */
    onDestroy() { }

    /**
     * Called when data is saved to file
     * @param {string} filePath - The file path
     */
    onSave(filePath) { }

    /**
     * Called when data is loaded from file
     * @param {string} filePath - The file path
     */
    onLoad(filePath) { }
}

// Export to global scope for use in modules
window.EditorWindow = EditorWindow;
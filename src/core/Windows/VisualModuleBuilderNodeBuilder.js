class VisualModuleBuilderNodeBuilder {
    constructor() {
        // Initialize node configuration
        this.nodeConfig = {
            type: '',
            label: '',
            color: '#3c643dff',
            icon: 'fas fa-cube',
            category: 'Custom',
            inputs: [],
            outputs: [],
            codeTemplate: '',
            hasInput: false,
            hasToggle: false,
            hasDropdown: false,
            hasColorPicker: false,
            hasExposeCheckbox: false,
            isGroup: false
        };

        this.isOpen = false;
        this.parentWindow = null;
    }

    show(parent) {
        if (this.isOpen) return;
        this.isOpen = true;
        this.parentWindow = parent; // Store the parent window reference
        this.showCustomNodeBuilder();
    }

    hide() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.hideCustomNodeBuilder();
    }

    /**
     * Show custom node builder modal
     */
    showCustomNodeBuilder() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'custom-node-builder-overlay';
        overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'custom-node-builder-modal';
        modal.style.cssText = `
        background: #1e1e1e;
        border-radius: 8px;
        width: 90%;
        max-width: 900px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;

        // Modal header
        const header = document.createElement('div');
        header.style.cssText = `
        padding: 20px;
        border-bottom: 1px solid #333;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

        const title = document.createElement('h2');
        title.textContent = 'Create Custom Node';
        title.style.cssText = 'color: #fff; margin: 0; font-size: 20px;';

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
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
        transition: background 0.2s;
    `;
        closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = '#333');
        closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = 'none');
        closeBtn.addEventListener('click', () => {
            this.hide();
        });

        header.appendChild(title);
        header.appendChild(closeBtn);
        modal.appendChild(header);

        // Modal body (scrollable)
        const body = document.createElement('div');
        body.style.cssText = `
        padding: 20px;
        overflow-y: auto;
        flex: 1;
    `;

        // Node configuration object
        const nodeConfig = {
            type: '',
            label: '',
            color: '#4CAF50',
            icon: 'fas fa-cube',
            category: 'Custom',
            inputs: [],
            outputs: [],
            codeTemplate: '',
            hasInput: false,
            hasToggle: false,
            hasDropdown: false,
            hasColorPicker: false,
            hasExposeCheckbox: false,
            isGroup: false
        };

        // Get categories from parent window's nodeLibrary
        const categories = this.parentWindow && this.parentWindow.nodeLibrary
            ? Object.keys(this.parentWindow.nodeLibrary).concat(['Custom'])
            : ['Custom'];

        // Create form sections
        body.appendChild(this.createNodeBuilderSection('Basic Properties', [
            this.createNodeBuilderField('Type', 'text', 'Unique node type identifier', (value) => {
                nodeConfig.type = value;
            }),
            this.createNodeBuilderField('Label', 'text', 'Display name', (value) => {
                nodeConfig.label = value;
            }),
            this.createNodeBuilderField('Category', 'select', 'Node category', (value) => {
                nodeConfig.category = value;
            }, categories),
            this.createNodeBuilderColorField('Color', '#4CAF50', (value) => {
                nodeConfig.color = value;
            }),
            this.createNodeBuilderIconField('Icon', 'fas fa-cube', (value) => {
                nodeConfig.icon = value;
            })
        ]));

        // Inputs section
        const inputsSection = this.createNodeBuilderListSection(
            'Input Ports',
            'Add input ports to this node',
            nodeConfig.inputs,
            () => ({ label: 'input', type: 'value' })
        );
        body.appendChild(inputsSection);

        // Outputs section
        const outputsSection = this.createNodeBuilderListSection(
            'Output Ports',
            'Add output ports to this node',
            nodeConfig.outputs,
            () => ({ label: 'output', type: 'value' })
        );
        body.appendChild(outputsSection);

        // Special Features section
        body.appendChild(this.createNodeBuilderSection('Special Features', [
            this.createNodeBuilderCheckboxField('Text Input', false, (value) => {
                nodeConfig.hasInput = value;
            }),
            this.createNodeBuilderCheckboxField('Toggle Switch', false, (value) => {
                nodeConfig.hasToggle = value;
            }),
            this.createNodeBuilderCheckboxField('Dropdown', false, (value) => {
                nodeConfig.hasDropdown = value;
            }),
            this.createNodeBuilderCheckboxField('Color Picker', false, (value) => {
                nodeConfig.hasColorPicker = value;
            }),
            this.createNodeBuilderCheckboxField('Expose Property', false, (value) => {
                nodeConfig.hasExposeCheckbox = value;
            }),
            this.createNodeBuilderCheckboxField('Group Node', false, (value) => {
                nodeConfig.isGroup = value;
            })
        ]));

        // Code Generation section
        body.appendChild(this.createNodeBuilderCodeGenSection(nodeConfig));

        modal.appendChild(body);

        // Modal footer
        const footer = document.createElement('div');
        footer.style.cssText = `
        padding: 20px;
        border-top: 1px solid #333;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
    `;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
        padding: 10px 24px;
        background: #444;
        border: 1px solid #666;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
    `;
        cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.background = '#555');
        cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.background = '#444');
        cancelBtn.addEventListener('click', () => this.hide());

        const createBtn = document.createElement('button');
        createBtn.textContent = 'Create Node';
        createBtn.style.cssText = `
        padding: 10px 24px;
        background: #4CAF50;
        border: 1px solid #66BB6A;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: background 0.2s;
    `;
        createBtn.addEventListener('mouseenter', () => createBtn.style.background = '#66BB6A');
        createBtn.addEventListener('mouseleave', () => createBtn.style.background = '#4CAF50');
        createBtn.addEventListener('click', () => {
            if (this.validateAndCreateCustomNode(nodeConfig)) {
                overlay.remove();
                // Call showNotification on parentWindow instead of this
                if (this.parentWindow && this.parentWindow.showNotification) {
                    this.parentWindow.showNotification(`Custom node "${nodeConfig.label}" created!`, 'success');
                }
            }
        });

        footer.appendChild(cancelBtn);
        footer.appendChild(createBtn);
        modal.appendChild(footer);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Close on overlay click
        /*overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });*/
    }

    hideCustomNodeBuilder() {
        const overlay = document.querySelector('.custom-node-builder-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Create a section in the node builder
     */
    createNodeBuilderSection(title, fields) {
        const section = document.createElement('div');
        section.style.cssText = `
        margin-bottom: 24px;
        padding: 16px;
        background: #252525;
        border-radius: 6px;
        border: 1px solid #333;
    `;

        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = title;
        sectionTitle.style.cssText = `
        color: #fff;
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
    `;
        section.appendChild(sectionTitle);

        fields.forEach(field => section.appendChild(field));

        return section;
    }

    /**
     * Create a text/select field
     */
    createNodeBuilderField(label, type, placeholder, onChange, options = []) {
        const fieldContainer = document.createElement('div');
        fieldContainer.style.cssText = `
        margin-bottom: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    `;

        const fieldLabel = document.createElement('label');
        fieldLabel.textContent = label;
        fieldLabel.style.cssText = `
        color: #aaa;
        font-size: 13px;
        font-weight: 500;
    `;
        fieldContainer.appendChild(fieldLabel);

        let input;
        if (type === 'select') {
            input = document.createElement('select');
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                input.appendChild(option);
            });
        } else {
            input = document.createElement('input');
            input.type = type;
            input.placeholder = placeholder;
        }

        input.style.cssText = `
        padding: 8px 12px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #fff;
        font-size: 13px;
        transition: border-color 0.2s;
    `;
        input.addEventListener('focus', () => input.style.borderColor = '#4CAF50');
        input.addEventListener('blur', () => input.style.borderColor = '#555');
        input.addEventListener('input', (e) => onChange(e.target.value));

        fieldContainer.appendChild(input);
        return fieldContainer;
    }

    /**
     * Create a checkbox field
     */
    createNodeBuilderCheckboxField(label, defaultValue, onChange) {
        const fieldContainer = document.createElement('div');
        fieldContainer.style.cssText = `
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = defaultValue;
        checkbox.style.cssText = `
        width: 18px;
        height: 18px;
        cursor: pointer;
    `;
        checkbox.addEventListener('change', (e) => onChange(e.target.checked));

        const fieldLabel = document.createElement('label');
        fieldLabel.textContent = label;
        fieldLabel.style.cssText = `
        color: #aaa;
        font-size: 13px;
        cursor: pointer;
    `;
        fieldLabel.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
            onChange(checkbox.checked);
        });

        fieldContainer.appendChild(checkbox);
        fieldContainer.appendChild(fieldLabel);
        return fieldContainer;
    }

    /**
     * Create a color field
     */
    createNodeBuilderColorField(label, defaultValue, onChange) {
        const fieldContainer = document.createElement('div');
        fieldContainer.style.cssText = `
        margin-bottom: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    `;

        const fieldLabel = document.createElement('label');
        fieldLabel.textContent = label;
        fieldLabel.style.cssText = `
        color: #aaa;
        font-size: 13px;
        font-weight: 500;
    `;
        fieldContainer.appendChild(fieldLabel);

        const colorContainer = document.createElement('div');
        colorContainer.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: center;
    `;

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = defaultValue;
        colorInput.style.cssText = `
        width: 50px;
        height: 36px;
        border: 1px solid #555;
        border-radius: 4px;
        cursor: pointer;
        background: none;
    `;

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = defaultValue;
        textInput.style.cssText = `
        flex: 1;
        padding: 8px 12px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #fff;
        font-size: 13px;
        font-family: monospace;
    `;

        colorInput.addEventListener('input', (e) => {
            textInput.value = e.target.value;
            onChange(e.target.value);
        });

        textInput.addEventListener('input', (e) => {
            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                colorInput.value = e.target.value;
                onChange(e.target.value);
            }
        });

        colorContainer.appendChild(colorInput);
        colorContainer.appendChild(textInput);
        fieldContainer.appendChild(colorContainer);

        return fieldContainer;
    }

    /**
     * Create icon field with dropdown
     */
    createNodeBuilderIconField(label, defaultValue, onChange) {
        const fieldContainer = document.createElement('div');
        fieldContainer.style.cssText = `
        margin-bottom: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    `;

        const fieldLabel = document.createElement('label');
        fieldLabel.textContent = label;
        fieldLabel.style.cssText = `
        color: #aaa;
        font-size: 13px;
        font-weight: 500;
    `;
        fieldContainer.appendChild(fieldLabel);

        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: center;
    `;

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = defaultValue;
        textInput.placeholder = 'e.g., fas fa-cube';
        textInput.style.cssText = `
        flex: 1;
        padding: 8px 12px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #fff;
        font-size: 13px;
    `;

        const previewIcon = document.createElement('i');
        previewIcon.className = defaultValue;
        previewIcon.style.cssText = `
        color: #fff;
        font-size: 20px;
        width: 30px;
        text-align: center;
    `;

        const browseBtn = document.createElement('button');
        browseBtn.innerHTML = '...';
        browseBtn.style.cssText = `
        padding: 8px 16px;
        background: #444;
        border: 1px solid #666;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        font-size: 13px;
    `;
        browseBtn.addEventListener('click', () => {
            this.showIconDropdown(textInput, previewIcon, null, (icon) => {
                textInput.value = icon;
                previewIcon.className = icon;
                onChange(icon);
            });
        });

        textInput.addEventListener('input', (e) => {
            previewIcon.className = e.target.value;
            onChange(e.target.value);
        });

        iconContainer.appendChild(textInput);
        iconContainer.appendChild(previewIcon);
        iconContainer.appendChild(browseBtn);
        fieldContainer.appendChild(iconContainer);

        return fieldContainer;
    }

    /**
     * Create a list section for inputs/outputs
     */
    createNodeBuilderListSection(title, description, list, createDefault) {
        const section = document.createElement('div');
        section.style.cssText = `
        margin-bottom: 24px;
        padding: 16px;
        background: #252525;
        border-radius: 6px;
        border: 1px solid #333;
    `;

        const header = document.createElement('div');
        header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    `;

        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

        const titleText = document.createElement('h3');
        titleText.textContent = title;
        titleText.style.cssText = `
        color: #fff;
        margin: 0;
        font-size: 16px;
        font-weight: 600;
    `;

        const descText = document.createElement('p');
        descText.textContent = description;
        descText.style.cssText = `
        color: #888;
        margin: 0;
        font-size: 12px;
    `;

        titleEl.appendChild(titleText);
        titleEl.appendChild(descText);

        const addBtn = document.createElement('button');
        addBtn.innerHTML = '<i class="fas fa-plus"></i> Add';
        addBtn.style.cssText = `
        padding: 6px 12px;
        background: #4CAF50;
        border: 1px solid #66BB6A;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
    `;

        header.appendChild(titleEl);
        header.appendChild(addBtn);
        section.appendChild(header);

        const itemsContainer = document.createElement('div');
        itemsContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;
        section.appendChild(itemsContainer);

        const renderItems = () => {
            itemsContainer.innerHTML = '';
            list.forEach((item, index) => {
                const itemEl = this.createNodeBuilderListItem(item, () => {
                    list.splice(index, 1);
                    renderItems();
                });
                itemsContainer.appendChild(itemEl);
            });

            if (list.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.textContent = 'No items yet. Click "Add" to create one.';
                emptyMsg.style.cssText = `
                color: #666;
                font-size: 12px;
                padding: 12px;
                text-align: center;
                font-style: italic;
            `;
                itemsContainer.appendChild(emptyMsg);
            }
        };

        addBtn.addEventListener('click', () => {
            list.push(createDefault());
            renderItems();
        });

        renderItems();

        return section;
    }

    /**
     * Create a list item for inputs/outputs
     */
    createNodeBuilderListItem(item, onRemove) {
        const itemEl = document.createElement('div');
        itemEl.style.cssText = `
        padding: 12px;
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 4px;
        display: flex;
        gap: 8px;
        align-items: center;
    `;

        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.value = item.label || '';
        labelInput.placeholder = 'Port label';
        labelInput.style.cssText = `
        flex: 1;
        padding: 6px 10px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
    `;
        labelInput.addEventListener('input', (e) => {
            item.label = e.target.value;
        });

        const typeSelect = document.createElement('select');
        typeSelect.style.cssText = `
        padding: 6px 10px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        cursor: pointer;
    `;

        ['value', 'flow'].forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            option.selected = item.type === type;
            typeSelect.appendChild(option);
        });

        typeSelect.addEventListener('change', (e) => {
            item.type = e.target.value;
        });

        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
        removeBtn.style.cssText = `
        padding: 6px 10px;
        background: #f44336;
        border: 1px solid #e53935;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        font-size: 12px;
    `;
        removeBtn.addEventListener('click', onRemove);

        itemEl.appendChild(labelInput);
        itemEl.appendChild(typeSelect);
        itemEl.appendChild(removeBtn);

        return itemEl;
    }

    /**
     * Create code generation section
     */
    createNodeBuilderCodeGenSection(nodeConfig) {
        const section = document.createElement('div');
        section.style.cssText = `
    margin-bottom: 24px;
    padding: 16px;
    background: #252525;
    border-radius: 6px;
    border: 1px solid #333;
`;

        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'margin-bottom: 12px;';

        const titleText = document.createElement('h3');
        titleText.textContent = 'Code Generation';
        titleText.style.cssText = `
    color: #fff;
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
`;

        const descText = document.createElement('p');
        descText.innerHTML = `
    Write the JavaScript code that this node will generate. Use simple placeholders for inputs:<br>
    <code style="color: #4CAF50;">INPUT(portLabel)</code> to reference input values<br>
    <code style="color: #4CAF50;">NODE.value</code> to reference the node's value property<br>
    <code style="color: #4CAF50;">NODE.dropdownValue</code> to reference dropdown selection
`;
        descText.style.cssText = `
    color: #888;
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
`;

        titleEl.appendChild(titleText);
        titleEl.appendChild(descText);
        section.appendChild(titleEl);

        const textarea = document.createElement('textarea');
        textarea.placeholder = `Example - Math node with two inputs (a, b):
INPUT(a) + INPUT(b)

Example - Comparison node:
INPUT(a) === INPUT(b)

Example - Using node value property:
INPUT(value) * NODE.value

Example - Flow node with action:
this.x = INPUT(x);
this.y = INPUT(y);

Note: For nodes with value outputs, just return the expression.
For flow nodes, write the statement to execute.`;
        textarea.rows = 8;
        textarea.style.cssText = `
    width: 100%;
    padding: 12px;
    background: #1a1a1a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #fff;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    resize: vertical;
    box-sizing: border-box;
`;
        textarea.addEventListener('input', (e) => {
            nodeConfig.codeTemplate = e.target.value;
        });

        section.appendChild(textarea);

        return section;
    }

    /**
     * Validate and create custom node
     */
    validateAndCreateCustomNode(nodeConfig) {
        // Validation
        if (!nodeConfig.type) {
            alert('Please provide a node type!');
            return false;
        }

        if (!nodeConfig.label) {
            alert('Please provide a node label!');
            return false;
        }

        if (!nodeConfig.category) {
            alert('Please select a category!');
            return false;
        }

        // Check for duplicate type
        if (this.parentWindow && this.parentWindow.nodeLibrary) {
            for (const category in this.parentWindow.nodeLibrary) {
                if (this.parentWindow.nodeLibrary[category].find(n => n.type === nodeConfig.type)) {
                    alert(`A node with type "${nodeConfig.type}" already exists!`);
                    return false;
                }
            }
        }

        // Create code generation function
        const codeGenFunction = (node, ctx) => {
            let code = nodeConfig.codeTemplate;

            // Replace INPUT(portLabel) with actual input values
            nodeConfig.inputs.forEach(input => {
                const placeholder = `INPUT(${input.label})`;
                const value = ctx.getInputValue(node, input.label);
                code = code.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
            });

            // Replace OUTPUT(portLabel) with output assignments
            nodeConfig.outputs.forEach(output => {
                const placeholder = `OUTPUT(${output.label})`;
                const outputVar = `output_${node.id}_${output.label}`;
                code = code.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), outputVar);
            });

            // Replace NODE.value
            code = code.replace(/NODE\.value/g, node.value !== undefined ? JSON.stringify(node.value) : 'null');

            // Replace NODE.dropdownValue
            code = code.replace(/NODE\.dropdownValue/g, node.dropdownValue ? `'${node.dropdownValue}'` : "''");

            return code;
        };

        // Create node definition
        const nodeDef = {
            type: nodeConfig.type,
            label: nodeConfig.label,
            color: nodeConfig.color,
            icon: nodeConfig.icon,
            inputs: nodeConfig.inputs.map(i => i.label),
            outputs: nodeConfig.outputs.map(o => o.label),
            hasInput: nodeConfig.hasInput,
            hasToggle: nodeConfig.hasToggle,
            hasDropdown: nodeConfig.hasDropdown,
            hasColorPicker: nodeConfig.hasColorPicker,
            hasExposeCheckbox: nodeConfig.hasExposeCheckbox,
            isGroup: nodeConfig.isGroup,
            codeGen: codeGenFunction,
            custom: true // Mark as custom node
        };

        // Add to node library
        if (this.parentWindow && this.parentWindow.nodeLibrary) {
            if (!this.parentWindow.nodeLibrary[nodeConfig.category]) {
                this.parentWindow.nodeLibrary[nodeConfig.category] = [];
            }

            this.parentWindow.nodeLibrary[nodeConfig.category].push(nodeDef);
        }

        // Rebuild sidebar using the correct selector and method
        if (this.parentWindow && this.parentWindow.element) {
            const sidebarContainer = this.parentWindow.element.querySelector('.vmb-sidebar');
            if (sidebarContainer && this.parentWindow.createSidebar) {
                const newSidebar = this.parentWindow.createSidebar();
                newSidebar.className = 'vmb-sidebar';
                sidebarContainer.parentNode.replaceChild(newSidebar, sidebarContainer);
            }
        }

        return true;
    }
}

window.visualModuleBuilderNodeBuilder = new VisualModuleBuilderNodeBuilder();
/**
 * VMBExampleModules - Predefined example modules for Visual Module Builder
 * These modules demonstrate various features and provide starting templates
 * 
 * NOW USES PUBLIC API METHODS FOR PROPER COLOR AND NODE CREATION
 */
class VMBExampleModules {
    /**
     * Get all available example modules
     */
    static getExamples() {
        return {
            'rectangle-drawer': this.createRectangleDrawer(),
            'basic-physics': this.createBasicPhysics(),
            'rotating-sprite': this.createRotatingSprite(),
            'click-counter': this.createClickCounter(),
            'color-cycler': this.createColorCycler(),
            'empty': this.createEmpty()
        };
    }

    /**
     * Get example module names for dropdown
     */
    static getExampleNames() {
        return [
            { value: '', label: 'Select an example...' },
            { value: 'empty', label: 'Empty Module' },
            { value: 'rectangle-drawer', label: 'Rectangle Drawer' },
            { value: 'basic-physics', label: 'Basic Physics' },
            { value: 'rotating-sprite', label: 'Rotating Sprite' },
            { value: 'click-counter', label: 'Click Counter' },
            { value: 'color-cycler', label: 'Color Cycler' }
        ];
    }

    /**
     * Helper: Create a temporary VMB instance to access node creation API
     */
    static getNodeBuilder() {
        if (!this._builder) {
            // Create a minimal mock builder just for accessing the API
            const tempVMB = new VisualModuleBuilderWindow();
            this._builder = {
                nodeLibrary: tempVMB.buildNodeLibrary(),
                
                getNodeColor(type) {
                    for (const category in this.nodeLibrary) {
                        const node = this.nodeLibrary[category].find(n => n.type === type);
                        if (node) return node.color;
                    }
                    return '#666666';
                },
                
                getNodeDefinition(type) {
                    for (const category in this.nodeLibrary) {
                        const node = this.nodeLibrary[category].find(n => n.type === type);
                        if (node) return { ...node };
                    }
                    return null;
                },
                
                calculateNodeHeight(definition) {
                    const inputCount = definition.inputs ? definition.inputs.filter(i => i !== 'flow').length : 0;
                    const outputCount = definition.outputs ? definition.outputs.filter(o => o !== 'flow').length : 0;
                    const maxDataPorts = Math.max(inputCount, outputCount);
                    
                    let baseHeight = 90;
                    if (definition.hasInput || definition.hasToggle || definition.hasColorPicker || 
                        definition.hasDropdown || definition.hasPropertyDropdown || definition.hasExposeCheckbox) {
                        baseHeight += 30;
                    }
                    if (maxDataPorts > 0) {
                        baseHeight += maxDataPorts * 30;
                    }
                    
                    return baseHeight;
                },
                
                createNode(type, x, y, options = {}) {
                    const definition = this.getNodeDefinition(type);
                    if (!definition) {
                        console.error(`Node type "${type}" not found`);
                        return null;
                    }
                    
                    return {
                        id: Date.now() + Math.random(),
                        type: type,
                        label: options.label || definition.label,
                        color: this.getNodeColor(type),
                        x: x,
                        y: y,
                        width: options.width || 180,
                        height: this.calculateNodeHeight(definition),
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
                        nodes: [],
                        codeGen: definition.codeGen
                    };
                }
            };
            
            // Clean up temp instance
            tempVMB.close();
        }
        return this._builder;
    }

    /**
     * Empty module template
     */
    static createEmpty() {
        return {
            moduleName: 'NewModule',
            moduleNamespace: 'Custom',
            moduleDescription: 'A new custom module',
            moduleIcon: 'fas fa-cube',
            moduleColor: '#4CAF50',
            allowMultiple: true,
            drawInEditor: true,
            nodes: [],
            connections: []
        };
    }

    /**
     * Rectangle Drawer - Demonstrates basic drawing with exposed properties
     */
    static createRectangleDrawer() {
        const builder = this.getNodeBuilder();
        const nodes = [];
        const connections = [];

        // Properties Setup - using API for correct colors
        const xNameNode = builder.createNode('string', 100, 100, { value: 'x' });
        const xValueNode = builder.createNode('number', 100, 220, { value: '100' });
        const xPropNode = builder.createNode('setProperty', 320, 120, { 
            exposeProperty: true, 
            groupName: 'Position' 
        });

        const yNameNode = builder.createNode('string', 550, 100, { value: 'y' });
        const yValueNode = builder.createNode('number', 550, 220, { value: '100' });
        const yPropNode = builder.createNode('setProperty', 770, 120, { 
            exposeProperty: true, 
            groupName: 'Position' 
        });

        const widthNameNode = builder.createNode('string', 100, 340, { value: 'width' });
        const widthValueNode = builder.createNode('number', 100, 460, { value: '200' });
        const widthPropNode = builder.createNode('setProperty', 320, 360, { 
            exposeProperty: true, 
            groupName: 'Size' 
        });

        const heightNameNode = builder.createNode('string', 550, 340, { value: 'height' });
        const heightValueNode = builder.createNode('number', 550, 460, { value: '150' });
        const heightPropNode = builder.createNode('setProperty', 770, 360, { 
            exposeProperty: true, 
            groupName: 'Size' 
        });

        const colorNameNode = builder.createNode('string', 100, 580, { value: 'color' });
        const colorValueNode = builder.createNode('color', 100, 700, { value: '#FF5722' });
        const colorPropNode = builder.createNode('setProperty', 320, 600, { 
            exposeProperty: true, 
            groupName: 'Style' 
        });

        // Start node
        const startNode = builder.createNode('start', 1050, 100, {});

        // Draw event
        const drawNode = builder.createNode('draw', 1050, 250, {});

        // Get properties
        const getXNode = builder.createNode('getProperty', 1300, 200, { selectedProperty: 'x' });
        const getYNode = builder.createNode('getProperty', 1300, 320, { selectedProperty: 'y' });
        const getWidthNode = builder.createNode('getProperty', 1300, 440, { selectedProperty: 'width' });
        const getHeightNode = builder.createNode('getProperty', 1300, 560, { selectedProperty: 'height' });
        const getColorNode = builder.createNode('getProperty', 1300, 680, { selectedProperty: 'color' });

        // fillRect call
        const fillRectNode = builder.createNode('fillRect', 1550, 400, {});

        // Add all nodes
        nodes.push(
            xNameNode, xValueNode, xPropNode,
            yNameNode, yValueNode, yPropNode,
            widthNameNode, widthValueNode, widthPropNode,
            heightNameNode, heightValueNode, heightPropNode,
            colorNameNode, colorValueNode, colorPropNode,
            startNode, drawNode,
            getXNode, getYNode, getWidthNode, getHeightNode, getColorNode,
            fillRectNode
        );

        // Create connections - Property setup
        connections.push(
            { from: xNameNode.id, fromPort: 0, to: xPropNode.id, toPort: 1 },
            { from: xValueNode.id, fromPort: 0, to: xPropNode.id, toPort: 2 },
            { from: yNameNode.id, fromPort: 0, to: yPropNode.id, toPort: 1 },
            { from: yValueNode.id, fromPort: 0, to: yPropNode.id, toPort: 2 },
            { from: widthNameNode.id, fromPort: 0, to: widthPropNode.id, toPort: 1 },
            { from: widthValueNode.id, fromPort: 0, to: widthPropNode.id, toPort: 2 },
            { from: heightNameNode.id, fromPort: 0, to: heightPropNode.id, toPort: 1 },
            { from: heightValueNode.id, fromPort: 0, to: heightPropNode.id, toPort: 2 },
            { from: colorNameNode.id, fromPort: 0, to: colorPropNode.id, toPort: 1 },
            { from: colorValueNode.id, fromPort: 0, to: colorPropNode.id, toPort: 2 }
        );

        // Event flow connections
        connections.push(
            { from: startNode.id, fromPort: 0, to: drawNode.id, toPort: 0 }
        );

        // Drawing connections
        connections.push(
            { from: drawNode.id, fromPort: 0, to: fillRectNode.id, toPort: 0 },
            { from: drawNode.id, fromPort: 1, to: fillRectNode.id, toPort: 1 },
            { from: getXNode.id, fromPort: 0, to: fillRectNode.id, toPort: 2 },
            { from: getYNode.id, fromPort: 0, to: fillRectNode.id, toPort: 3 },
            { from: getWidthNode.id, fromPort: 0, to: fillRectNode.id, toPort: 4 },
            { from: getHeightNode.id, fromPort: 0, to: fillRectNode.id, toPort: 5 },
            { from: getColorNode.id, fromPort: 0, to: fillRectNode.id, toPort: 6 }
        );

        return {
            moduleName: 'RectangleDrawer',
            moduleNamespace: 'Drawing',
            moduleDescription: 'Draws a customizable rectangle with exposed properties',
            moduleIcon: 'fas fa-square',
            moduleColor: '#FF5722',
            allowMultiple: true,
            drawInEditor: true,
            nodes: nodes,
            connections: connections
        };
    }

    /**
     * Basic Physics - Demonstrates physics simulation
     */
    static createBasicPhysics() {
        const builder = this.getNodeBuilder();
        const nodes = [];
        const connections = [];

        // Start event
        const startNode = builder.createNode('start', 100, 100, {});

        // Initialize X, Y, velocityY
        const xNameNode = builder.createNode('string', 100, 220, { value: 'x' });
        const xValueNode = builder.createNode('number', 100, 340, { value: '400' });
        const xPropNode = builder.createNode('setProperty', 320, 240, {});

        const yNameNode = builder.createNode('string', 100, 460, { value: 'y' });
        const yValueNode = builder.createNode('number', 100, 580, { value: '100' });
        const yPropNode = builder.createNode('setProperty', 320, 480, {});

        const vyNameNode = builder.createNode('string', 550, 340, { value: 'velocityY' });
        const vyValueNode = builder.createNode('number', 550, 460, { value: '0' });
        const vyPropNode = builder.createNode('setProperty', 770, 360, {});

        // Loop event
        const loopNode = builder.createNode('loop', 100, 720, {});
        
        // Update Y position
        const getYNode = builder.createNode('getProperty', 320, 720, { selectedProperty: 'y' });
        const getVYNode = builder.createNode('getProperty', 320, 840, { selectedProperty: 'velocityY' });
        const addYNode = builder.createNode('add', 550, 760, {});
        const setYNameNode = builder.createNode('string', 550, 640, { value: 'y' });
        const setYNode = builder.createNode('setProperty', 770, 720, {});

        // Apply gravity
        const gravityNode = builder.createNode('number', 320, 960, { value: '0.5' });
        const addGravityNode = builder.createNode('add', 550, 920, {});
        const setVYNameNode = builder.createNode('string', 550, 800, { value: 'velocityY' });
        const setVYNode = builder.createNode('setProperty', 770, 880, {});

        // Draw event
        const drawNode = builder.createNode('draw', 1050, 720, {});
        const getDrawXNode = builder.createNode('getProperty', 1300, 680, { selectedProperty: 'x' });
        const getDrawYNode = builder.createNode('getProperty', 1300, 800, { selectedProperty: 'y' });
        const sizeNode = builder.createNode('number', 1300, 920, { value: '20' });
        const drawColorNode = builder.createNode('color', 1300, 1040, { value: '#2196F3' });
        const fillCircleNode = builder.createNode('fillCircle', 1550, 820, {});

        nodes.push(
            startNode, xNameNode, xValueNode, xPropNode,
            yNameNode, yValueNode, yPropNode,
            vyNameNode, vyValueNode, vyPropNode,
            loopNode, getYNode, getVYNode, addYNode, setYNode, setYNameNode,
            gravityNode, addGravityNode, setVYNode, setVYNameNode,
            drawNode, getDrawXNode, getDrawYNode, sizeNode, drawColorNode, fillCircleNode
        );

        // Start connections
        connections.push(
            { from: startNode.id, fromPort: 0, to: xPropNode.id, toPort: 0 },
            { from: xNameNode.id, fromPort: 0, to: xPropNode.id, toPort: 1 },
            { from: xValueNode.id, fromPort: 0, to: xPropNode.id, toPort: 2 },
            { from: xPropNode.id, fromPort: 0, to: yPropNode.id, toPort: 0 },
            { from: yNameNode.id, fromPort: 0, to: yPropNode.id, toPort: 1 },
            { from: yValueNode.id, fromPort: 0, to: yPropNode.id, toPort: 2 },
            { from: yPropNode.id, fromPort: 0, to: vyPropNode.id, toPort: 0 },
            { from: vyNameNode.id, fromPort: 0, to: vyPropNode.id, toPort: 1 },
            { from: vyValueNode.id, fromPort: 0, to: vyPropNode.id, toPort: 2 }
        );

        // Loop connections
        connections.push(
            { from: loopNode.id, fromPort: 0, to: setYNode.id, toPort: 0 },
            { from: setYNameNode.id, fromPort: 0, to: setYNode.id, toPort: 1 },
            { from: getYNode.id, fromPort: 0, to: addYNode.id, toPort: 0 },
            { from: getVYNode.id, fromPort: 0, to: addYNode.id, toPort: 1 },
            { from: addYNode.id, fromPort: 0, to: setYNode.id, toPort: 2 },
            { from: setYNode.id, fromPort: 0, to: setVYNode.id, toPort: 0 },
            { from: setVYNameNode.id, fromPort: 0, to: setVYNode.id, toPort: 1 },
            { from: getVYNode.id, fromPort: 0, to: addGravityNode.id, toPort: 0 },
            { from: gravityNode.id, fromPort: 0, to: addGravityNode.id, toPort: 1 },
            { from: addGravityNode.id, fromPort: 0, to: setVYNode.id, toPort: 2 }
        );

        // Draw connections
        connections.push(
            { from: drawNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 0 },
            { from: drawNode.id, fromPort: 1, to: fillCircleNode.id, toPort: 1 },
            { from: getDrawXNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 2 },
            { from: getDrawYNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 3 },
            { from: sizeNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 4 },
            { from: drawColorNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 5 }
        );

        return {
            moduleName: 'BasicPhysics',
            moduleNamespace: 'Physics',
            moduleDescription: 'A simple physics object with gravity',
            moduleIcon: 'fas fa-atom',
            moduleColor: '#9C27B0',
            allowMultiple: true,
            drawInEditor: true,
            nodes: nodes,
            connections: connections
        };
    }

    /**
     * Rotating Sprite - Demonstrates continuous rotation
     */
    static createRotatingSprite() {
        const builder = this.getNodeBuilder();
        const nodes = [];
        const connections = [];

        const startNode = builder.createNode('start', 100, 100, {});
        
        const rotNameNode = builder.createNode('string', 100, 220, { value: 'rotation' });
        const rotValueNode = builder.createNode('number', 100, 340, { value: '0' });
        const rotPropNode = builder.createNode('setProperty', 320, 240, {});

        const speedNameNode = builder.createNode('string', 550, 220, { value: 'rotationSpeed' });
        const speedValueNode = builder.createNode('number', 550, 340, { value: '0.05' });
        const speedPropNode = builder.createNode('setProperty', 770, 240, { 
            exposeProperty: true, 
            groupName: 'Rotation' 
        });

        const loopNode = builder.createNode('loop', 100, 500, {});
        const getRotNode = builder.createNode('getProperty', 320, 500, { selectedProperty: 'rotation' });
        const getSpeedNode = builder.createNode('getProperty', 320, 620, { selectedProperty: 'rotationSpeed' });
        const addRotNode = builder.createNode('add', 550, 540, {});
        const setRotNameNode = builder.createNode('string', 550, 420, { value: 'rotation' });
        const setRotNode = builder.createNode('setProperty', 770, 500, {});

        const gameObjRotNode = builder.createNode('setRotation', 1000, 500, {});
        const getRotForGONode = builder.createNode('getProperty', 770, 660, { selectedProperty: 'rotation' });

        nodes.push(
            startNode, rotNameNode, rotValueNode, rotPropNode,
            speedNameNode, speedValueNode, speedPropNode,
            loopNode, getRotNode, getSpeedNode, addRotNode,
            setRotNode, setRotNameNode, gameObjRotNode, getRotForGONode
        );

        connections.push(
            { from: startNode.id, fromPort: 0, to: rotPropNode.id, toPort: 0 },
            { from: rotNameNode.id, fromPort: 0, to: rotPropNode.id, toPort: 1 },
            { from: rotValueNode.id, fromPort: 0, to: rotPropNode.id, toPort: 2 },
            { from: rotPropNode.id, fromPort: 0, to: speedPropNode.id, toPort: 0 },
            { from: speedNameNode.id, fromPort: 0, to: speedPropNode.id, toPort: 1 },
            { from: speedValueNode.id, fromPort: 0, to: speedPropNode.id, toPort: 2 },
            { from: loopNode.id, fromPort: 0, to: setRotNode.id, toPort: 0 },
            { from: setRotNameNode.id, fromPort: 0, to: setRotNode.id, toPort: 1 },
            { from: getRotNode.id, fromPort: 0, to: addRotNode.id, toPort: 0 },
            { from: getSpeedNode.id, fromPort: 0, to: addRotNode.id, toPort: 1 },
            { from: addRotNode.id, fromPort: 0, to: setRotNode.id, toPort: 2 },
            { from: setRotNode.id, fromPort: 0, to: gameObjRotNode.id, toPort: 0 },
            { from: getRotForGONode.id, fromPort: 0, to: gameObjRotNode.id, toPort: 1 }
        );

        return {
            moduleName: 'RotatingSprite',
            moduleNamespace: 'Animation',
            moduleDescription: 'Continuously rotates the game object',
            moduleIcon: 'fas fa-rotate',
            moduleColor: '#FF9800',
            allowMultiple: true,
            drawInEditor: false,
            nodes: nodes,
            connections: connections
        };
    }

    /**
     * Click Counter - Demonstrates user interaction
     */
    static createClickCounter() {
        const builder = this.getNodeBuilder();
        const nodes = [];
        const connections = [];

        const startNode = builder.createNode('start', 100, 100, {});
        
        const counterNameNode = builder.createNode('string', 100, 220, { value: 'clickCount' });
        const counterValueNode = builder.createNode('number', 100, 340, { value: '0' });
        const counterPropNode = builder.createNode('setProperty', 320, 240, { 
            exposeProperty: true, 
            groupName: 'Display' 
        });

        const drawNode = builder.createNode('draw', 100, 500, {});
        const getCountNode = builder.createNode('getProperty', 320, 500, { selectedProperty: 'clickCount' });
        
        const xPosNode = builder.createNode('number', 550, 460, { value: '0' });
        const yPosNode = builder.createNode('number', 550, 580, { value: '0' });
        const colorNode = builder.createNode('color', 550, 700, { value: '#FFFFFF' });
        const drawTextNode = builder.createNode('drawText', 800, 540, {});

        nodes.push(
            startNode, counterNameNode, counterValueNode, counterPropNode,
            drawNode, getCountNode, xPosNode, yPosNode, colorNode, drawTextNode
        );

        connections.push(
            { from: startNode.id, fromPort: 0, to: counterPropNode.id, toPort: 0 },
            { from: counterNameNode.id, fromPort: 0, to: counterPropNode.id, toPort: 1 },
            { from: counterValueNode.id, fromPort: 0, to: counterPropNode.id, toPort: 2 },
            { from: drawNode.id, fromPort: 0, to: drawTextNode.id, toPort: 0 },
            { from: drawNode.id, fromPort: 1, to: drawTextNode.id, toPort: 1 },
            { from: getCountNode.id, fromPort: 0, to: drawTextNode.id, toPort: 2 },
            { from: xPosNode.id, fromPort: 0, to: drawTextNode.id, toPort: 3 },
            { from: yPosNode.id, fromPort: 0, to: drawTextNode.id, toPort: 4 },
            { from: colorNode.id, fromPort: 0, to: drawTextNode.id, toPort: 5 }
        );

        return {
            moduleName: 'ClickCounter',
            moduleNamespace: 'UI',
            moduleDescription: 'Displays a click counter (increment via script or exposed property)',
            moduleIcon: 'fas fa-mouse-pointer',
            moduleColor: '#00BCD4',
            allowMultiple: true,
            drawInEditor: true,
            nodes: nodes,
            connections: connections
        };
    }

    /**
     * Color Cycler - Demonstrates color animation
     */
    static createColorCycler() {
        const builder = this.getNodeBuilder();
        const nodes = [];
        const connections = [];

        const startNode = builder.createNode('start', 100, 100, {});
        
        const hueNameNode = builder.createNode('string', 100, 220, { value: 'hue' });
        const hueValueNode = builder.createNode('number', 100, 340, { value: '0' });
        const huePropNode = builder.createNode('setProperty', 320, 240, {});

        const speedNameNode = builder.createNode('string', 550, 220, { value: 'cycleSpeed' });
        const speedValueNode = builder.createNode('number', 550, 340, { value: '1' });
        const speedPropNode = builder.createNode('setProperty', 770, 240, { 
            exposeProperty: true, 
            groupName: 'Animation' 
        });

        const loopNode = builder.createNode('loop', 100, 500, {});
        const getHueNode = builder.createNode('getProperty', 320, 500, { selectedProperty: 'hue' });
        const getSpeedNode = builder.createNode('getProperty', 320, 620, { selectedProperty: 'cycleSpeed' });
        const addHueNode = builder.createNode('add', 550, 540, {});
        
        const maxHueNode = builder.createNode('number', 550, 680, { value: '360' });
        const moduloNode = builder.createNode('modulo', 770, 600, {});
        const setHueNameNode = builder.createNode('string', 770, 480, { value: 'hue' });
        const setHueNode = builder.createNode('setProperty', 1000, 560, {});

        const drawNode = builder.createNode('draw', 100, 820, {});
        const getDrawHueNode = builder.createNode('getProperty', 320, 820, { selectedProperty: 'hue' });
        const xNode = builder.createNode('number', 320, 940, { value: '0' });
        const yNode = builder.createNode('number', 320, 1060, { value: '0' });
        const radiusNode = builder.createNode('number', 550, 940, { value: '30' });
        const colorNode = builder.createNode('color', 550, 1060, { value: '#FF00FF' });
        const fillCircleNode = builder.createNode('fillCircle', 800, 920, {});

        nodes.push(
            startNode, hueNameNode, hueValueNode, huePropNode,
            speedNameNode, speedValueNode, speedPropNode,
            loopNode, getHueNode, getSpeedNode, addHueNode,
            maxHueNode, moduloNode, setHueNode, setHueNameNode,
            drawNode, getDrawHueNode, xNode, yNode, radiusNode, colorNode, fillCircleNode
        );

        connections.push(
            { from: startNode.id, fromPort: 0, to: huePropNode.id, toPort: 0 },
            { from: hueNameNode.id, fromPort: 0, to: huePropNode.id, toPort: 1 },
            { from: hueValueNode.id, fromPort: 0, to: huePropNode.id, toPort: 2 },
            { from: huePropNode.id, fromPort: 0, to: speedPropNode.id, toPort: 0 },
            { from: speedNameNode.id, fromPort: 0, to: speedPropNode.id, toPort: 1 },
            { from: speedValueNode.id, fromPort: 0, to: speedPropNode.id, toPort: 2 },
            { from: loopNode.id, fromPort: 0, to: setHueNode.id, toPort: 0 },
            { from: setHueNameNode.id, fromPort: 0, to: setHueNode.id, toPort: 1 },
            { from: getHueNode.id, fromPort: 0, to: addHueNode.id, toPort: 0 },
            { from: getSpeedNode.id, fromPort: 0, to: addHueNode.id, toPort: 1 },
            { from: addHueNode.id, fromPort: 0, to: moduloNode.id, toPort: 0 },
            { from: maxHueNode.id, fromPort: 0, to: moduloNode.id, toPort: 1 },
            { from: moduloNode.id, fromPort: 0, to: setHueNode.id, toPort: 2 },
            { from: drawNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 0 },
            { from: drawNode.id, fromPort: 1, to: fillCircleNode.id, toPort: 1 },
            { from: xNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 2 },
            { from: yNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 3 },
            { from: radiusNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 4 },
            { from: colorNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 5 }
        );

        return {
            moduleName: 'ColorCycler',
            moduleNamespace: 'Animation',
            moduleDescription: 'Cycles through colors over time (demonstrates modulo operation)',
            moduleIcon: 'fas fa-palette',
            moduleColor: '#E91E63',
            allowMultiple: true,
            drawInEditor: true,
            nodes: nodes,
            connections: connections
        };
    }
}

// Register globally
window.VMBExampleModules = VMBExampleModules;
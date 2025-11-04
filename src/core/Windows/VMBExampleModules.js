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
            // Access the static node library if available
            let nodeLibrary = {};
            
            // Try to get it from a global registry if one exists
            if (window._VMBNodeLibrary) {
                nodeLibrary = window._VMBNodeLibrary;
            } else {
                // Last resort: use a hardcoded minimal library
                nodeLibrary = this._getMinimalNodeLibrary();
            }
            
            this._builder = {
                nodeLibrary: nodeLibrary,
                
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

        // Properties Setup - Row 1: X property
        const xNameNode = builder.createNode('string', 100, 100, { value: 'x' });
        const xValueNode = builder.createNode('number', 100, 250, { value: '100' });
        const xPropNode = builder.createNode('setProperty', 350, 150, { 
            exposeProperty: true, 
            groupName: 'Position' 
        });

        // Row 2: Y property
        const yNameNode = builder.createNode('string', 600, 100, { value: 'y' });
        const yValueNode = builder.createNode('number', 600, 250, { value: '100' });
        const yPropNode = builder.createNode('setProperty', 850, 150, { 
            exposeProperty: true, 
            groupName: 'Position' 
        });

        // Row 3: Width property
        const widthNameNode = builder.createNode('string', 100, 400, { value: 'width' });
        const widthValueNode = builder.createNode('number', 100, 550, { value: '200' });
        const widthPropNode = builder.createNode('setProperty', 350, 450, { 
            exposeProperty: true, 
            groupName: 'Size' 
        });

        // Row 4: Height property
        const heightNameNode = builder.createNode('string', 600, 400, { value: 'height' });
        const heightValueNode = builder.createNode('number', 600, 550, { value: '150' });
        const heightPropNode = builder.createNode('setProperty', 850, 450, { 
            exposeProperty: true, 
            groupName: 'Size' 
        });

        // Row 5: Color property
        const colorNameNode = builder.createNode('string', 100, 700, { value: 'fillColor' });
        const colorValueNode = builder.createNode('color', 100, 850, { value: '#FF5722' });
        const colorPropNode = builder.createNode('setProperty', 350, 750, { 
            exposeProperty: true, 
            groupName: 'Style' 
        });

        // Drawing section - Start
        const startNode = builder.createNode('start', 1150, 100, {});
        const drawNode = builder.createNode('draw', 1150, 300, {});

        // Property name strings for getProperty nodes
        const xPropNameNode = builder.createNode('string', 1400, 200, { value: 'x' });
        const yPropNameNode = builder.createNode('string', 1400, 350, { value: 'y' });
        const widthPropNameNode = builder.createNode('string', 1400, 500, { value: 'width' });
        const heightPropNameNode = builder.createNode('string', 1400, 650, { value: 'height' });
        const colorPropNameNode = builder.createNode('string', 1400, 800, { value: 'fillColor' });

        // Get properties
        const getXNode = builder.createNode('getProperty', 1650, 250, {});
        const getYNode = builder.createNode('getProperty', 1650, 400, {});
        const getWidthNode = builder.createNode('getProperty', 1650, 550, {});
        const getHeightNode = builder.createNode('getProperty', 1650, 700, {});
        const getColorNode = builder.createNode('getProperty', 1650, 850, {});

        // fillRect call
        const fillRectNode = builder.createNode('fillRect', 1900, 500, {});

        // Add all nodes
        nodes.push(
            xNameNode, xValueNode, xPropNode,
            yNameNode, yValueNode, yPropNode,
            widthNameNode, widthValueNode, widthPropNode,
            heightNameNode, heightValueNode, heightPropNode,
            colorNameNode, colorValueNode, colorPropNode,
            startNode, drawNode,
            xPropNameNode, yPropNameNode, widthPropNameNode, heightPropNameNode, colorPropNameNode,
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

        // Connect property name strings to getProperty 'name' inputs
        connections.push(
            { from: xPropNameNode.id, fromPort: 0, to: getXNode.id, toPort: 0 },
            { from: yPropNameNode.id, fromPort: 0, to: getYNode.id, toPort: 0 },
            { from: widthPropNameNode.id, fromPort: 0, to: getWidthNode.id, toPort: 0 },
            { from: heightPropNameNode.id, fromPort: 0, to: getHeightNode.id, toPort: 0 },
            { from: colorPropNameNode.id, fromPort: 0, to: getColorNode.id, toPort: 0 }
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

        // Initialize X
        const xNameNode = builder.createNode('string', 100, 300, { value: 'x' });
        const xValueNode = builder.createNode('number', 100, 450, { value: '400' });
        const xPropNode = builder.createNode('setProperty', 350, 350, {});

        // Initialize Y
        const yNameNode = builder.createNode('string', 600, 300, { value: 'y' });
        const yValueNode = builder.createNode('number', 600, 450, { value: '100' });
        const yPropNode = builder.createNode('setProperty', 850, 350, {});

        // Initialize velocityY
        const vyNameNode = builder.createNode('string', 1100, 300, { value: 'velocityY' });
        const vyValueNode = builder.createNode('number', 1100, 450, { value: '0' });
        const vyPropNode = builder.createNode('setProperty', 1350, 350, {});

        // Loop event
        const loopNode = builder.createNode('loop', 100, 700, {});
        
        // Update Y position
        const yPropName1 = builder.createNode('string', 350, 650, { value: 'y' });
        const vyPropName1 = builder.createNode('string', 350, 800, { value: 'velocityY' });
        const getYNode = builder.createNode('getProperty', 600, 700, {});
        const getVYNode = builder.createNode('getProperty', 600, 850, {});
        const addYNode = builder.createNode('add', 850, 750, {});
        const setYNameNode = builder.createNode('string', 850, 600, { value: 'y' });
        const setYNode = builder.createNode('setProperty', 1100, 700, {});

        // Apply gravity
        const vyPropName2 = builder.createNode('string', 1350, 650, { value: 'velocityY' });
        const getVYNode2 = builder.createNode('getProperty', 1600, 700, {});
        const gravityNode = builder.createNode('number', 1600, 850, { value: '0.5' });
        const addGravityNode = builder.createNode('add', 1850, 750, {});
        const setVYNameNode = builder.createNode('string', 1850, 600, { value: 'velocityY' });
        const setVYNode = builder.createNode('setProperty', 2100, 700, {});

        // Draw event
        const drawNode = builder.createNode('draw', 100, 1100, {});
        const xPropName2 = builder.createNode('string', 350, 1050, { value: 'x' });
        const yPropName2 = builder.createNode('string', 350, 1200, { value: 'y' });
        const getDrawXNode = builder.createNode('getProperty', 600, 1100, {});
        const getDrawYNode = builder.createNode('getProperty', 600, 1250, {});
        const sizeNode = builder.createNode('number', 850, 1150, { value: '20' });
        const drawColorNode = builder.createNode('color', 850, 1300, { value: '#2196F3' });
        const fillCircleNode = builder.createNode('fillCircle', 1100, 1200, {});

        nodes.push(
            startNode, xNameNode, xValueNode, xPropNode,
            yNameNode, yValueNode, yPropNode,
            vyNameNode, vyValueNode, vyPropNode,
            loopNode, yPropName1, vyPropName1, getYNode, getVYNode, addYNode, setYNode, setYNameNode,
            vyPropName2, getVYNode2, gravityNode, addGravityNode, setVYNode, setVYNameNode,
            drawNode, xPropName2, yPropName2, getDrawXNode, getDrawYNode, sizeNode, drawColorNode, fillCircleNode
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
            { from: yPropName1.id, fromPort: 0, to: getYNode.id, toPort: 0 },
            { from: vyPropName1.id, fromPort: 0, to: getVYNode.id, toPort: 0 },
            { from: getYNode.id, fromPort: 0, to: addYNode.id, toPort: 0 },
            { from: getVYNode.id, fromPort: 0, to: addYNode.id, toPort: 1 },
            { from: addYNode.id, fromPort: 0, to: setYNode.id, toPort: 2 },
            { from: setYNode.id, fromPort: 0, to: setVYNode.id, toPort: 0 },
            { from: setVYNameNode.id, fromPort: 0, to: setVYNode.id, toPort: 1 },
            { from: vyPropName2.id, fromPort: 0, to: getVYNode2.id, toPort: 0 },
            { from: getVYNode2.id, fromPort: 0, to: addGravityNode.id, toPort: 0 },
            { from: gravityNode.id, fromPort: 0, to: addGravityNode.id, toPort: 1 },
            { from: addGravityNode.id, fromPort: 0, to: setVYNode.id, toPort: 2 }
        );

        // Draw connections
        connections.push(
            { from: drawNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 0 },
            { from: drawNode.id, fromPort: 1, to: fillCircleNode.id, toPort: 1 },
            { from: xPropName2.id, fromPort: 0, to: getDrawXNode.id, toPort: 0 },
            { from: yPropName2.id, fromPort: 0, to: getDrawYNode.id, toPort: 0 },
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
        
        // Initialize rotation
        const rotNameNode = builder.createNode('string', 100, 300, { value: 'rotation' });
        const rotValueNode = builder.createNode('number', 100, 450, { value: '0' });
        const rotPropNode = builder.createNode('setProperty', 350, 350, {});

        // Initialize speed
        const speedNameNode = builder.createNode('string', 600, 300, { value: 'rotationSpeed' });
        const speedValueNode = builder.createNode('number', 600, 450, { value: '0.05' });
        const speedPropNode = builder.createNode('setProperty', 850, 350, { 
            exposeProperty: true, 
            groupName: 'Rotation' 
        });

        const loopNode = builder.createNode('loop', 100, 650, {});
        
        // Update rotation
        const rotPropName1 = builder.createNode('string', 350, 600, { value: 'rotation' });
        const speedPropName = builder.createNode('string', 350, 750, { value: 'rotationSpeed' });
        const getRotNode = builder.createNode('getProperty', 600, 650, {});
        const getSpeedNode = builder.createNode('getProperty', 600, 800, {});
        const addRotNode = builder.createNode('add', 850, 700, {});
        const setRotNameNode = builder.createNode('string', 850, 550, { value: 'rotation' });
        const setRotNode = builder.createNode('setProperty', 1100, 650, {});

        // Apply to game object
        const rotPropName2 = builder.createNode('string', 1350, 600, { value: 'rotation' });
        const getRotForGONode = builder.createNode('getProperty', 1600, 650, {});
        const gameObjRotNode = builder.createNode('setAngle', 1850, 650, {});

        nodes.push(
            startNode, rotNameNode, rotValueNode, rotPropNode,
            speedNameNode, speedValueNode, speedPropNode,
            loopNode, rotPropName1, speedPropName, getRotNode, getSpeedNode, addRotNode,
            setRotNode, setRotNameNode, rotPropName2, gameObjRotNode, getRotForGONode
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
            { from: rotPropName1.id, fromPort: 0, to: getRotNode.id, toPort: 0 },
            { from: speedPropName.id, fromPort: 0, to: getSpeedNode.id, toPort: 0 },
            { from: getRotNode.id, fromPort: 0, to: addRotNode.id, toPort: 0 },
            { from: getSpeedNode.id, fromPort: 0, to: addRotNode.id, toPort: 1 },
            { from: addRotNode.id, fromPort: 0, to: setRotNode.id, toPort: 2 },
            { from: setRotNode.id, fromPort: 0, to: gameObjRotNode.id, toPort: 0 },
            { from: rotPropName2.id, fromPort: 0, to: getRotForGONode.id, toPort: 0 },
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
        
        // Initialize counter
        const counterNameNode = builder.createNode('string', 100, 300, { value: 'clickCount' });
        const counterValueNode = builder.createNode('number', 100, 450, { value: '0' });
        const counterPropNode = builder.createNode('setProperty', 350, 350, { 
            exposeProperty: true, 
            groupName: 'Display' 
        });

        const drawNode = builder.createNode('draw', 100, 700, {});
        
        // Get counter value
        const countPropName = builder.createNode('string', 350, 650, { value: 'clickCount' });
        const getCountNode = builder.createNode('getProperty', 600, 700, {});
        
        // Draw text
        const xPosNode = builder.createNode('number', 850, 650, { value: '10' });
        const yPosNode = builder.createNode('number', 850, 800, { value: '30' });
        const colorNode = builder.createNode('color', 1100, 700, { value: '#FFFFFF' });
        const drawTextNode = builder.createNode('drawText', 1350, 750, {});

        nodes.push(
            startNode, counterNameNode, counterValueNode, counterPropNode,
            drawNode, countPropName, getCountNode, xPosNode, yPosNode, colorNode, drawTextNode
        );

        connections.push(
            { from: startNode.id, fromPort: 0, to: counterPropNode.id, toPort: 0 },
            { from: counterNameNode.id, fromPort: 0, to: counterPropNode.id, toPort: 1 },
            { from: counterValueNode.id, fromPort: 0, to: counterPropNode.id, toPort: 2 },
            { from: drawNode.id, fromPort: 0, to: drawTextNode.id, toPort: 0 },
            { from: drawNode.id, fromPort: 1, to: drawTextNode.id, toPort: 1 },
            { from: countPropName.id, fromPort: 0, to: getCountNode.id, toPort: 0 },
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
        
        // Initialize hue
        const hueNameNode = builder.createNode('string', 100, 300, { value: 'hue' });
        const hueValueNode = builder.createNode('number', 100, 450, { value: '0' });
        const huePropNode = builder.createNode('setProperty', 350, 350, {});

        // Initialize speed
        const speedNameNode = builder.createNode('string', 600, 300, { value: 'cycleSpeed' });
        const speedValueNode = builder.createNode('number', 600, 450, { value: '1' });
        const speedPropNode = builder.createNode('setProperty', 850, 350, { 
            exposeProperty: true, 
            groupName: 'Animation' 
        });

        const loopNode = builder.createNode('loop', 100, 650, {});
        
        // Update hue
        const huePropName1 = builder.createNode('string', 350, 600, { value: 'hue' });
        const speedPropName = builder.createNode('string', 350, 750, { value: 'cycleSpeed' });
        const getHueNode = builder.createNode('getProperty', 600, 650, {});
        const getSpeedNode = builder.createNode('getProperty', 600, 800, {});
        const addHueNode = builder.createNode('add', 850, 700, {});
        
        // Modulo to wrap around 360
        const maxHueNode = builder.createNode('number', 1100, 650, { value: '360' });
        const moduloNode = builder.createNode('modulo', 1100, 750, {});
        const setHueNameNode = builder.createNode('string', 1350, 600, { value: 'hue' });
        const setHueNode = builder.createNode('setProperty', 1350, 700, {});

        const drawNode = builder.createNode('draw', 100, 1050, {});
        
        // Draw circle with fixed color (hue-to-color conversion would be complex)
        const xNode = builder.createNode('number', 350, 1050, { value: '0' });
        const yNode = builder.createNode('number', 350, 1200, { value: '0' });
        const radiusNode = builder.createNode('number', 600, 1050, { value: '30' });
        const colorNode = builder.createNode('color', 600, 1200, { value: '#FF00FF' });
        const fillCircleNode = builder.createNode('fillCircle', 850, 1100, {});

        nodes.push(
            startNode, hueNameNode, hueValueNode, huePropNode,
            speedNameNode, speedValueNode, speedPropNode,
            loopNode, huePropName1, speedPropName, getHueNode, getSpeedNode, addHueNode,
            maxHueNode, moduloNode, setHueNode, setHueNameNode,
            drawNode, xNode, yNode, radiusNode, colorNode, fillCircleNode
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
            { from: huePropName1.id, fromPort: 0, to: getHueNode.id, toPort: 0 },
            { from: speedPropName.id, fromPort: 0, to: getSpeedNode.id, toPort: 0 },
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
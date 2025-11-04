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

        // Start event to initialize properties
        const startNode = builder.createNode('start', 100, 100, {});

        // Properties Setup - Row 1: X property
        const xNameNode = builder.createNode('string', 350, 50, { value: 'x' });
        const xValueNode = builder.createNode('number', 350, 200, { value: '100' });
        const xPropNode = builder.createNode('setProperty', 600, 100, { 
            exposeProperty: true, 
            groupName: 'Position' 
        });

        // Row 2: Y property
        const yNameNode = builder.createNode('string', 850, 50, { value: 'y' });
        const yValueNode = builder.createNode('number', 850, 200, { value: '100' });
        const yPropNode = builder.createNode('setProperty', 1100, 100, { 
            exposeProperty: true, 
            groupName: 'Position' 
        });

        // Row 3: Width property
        const widthNameNode = builder.createNode('string', 350, 350, { value: 'width' });
        const widthValueNode = builder.createNode('number', 350, 500, { value: '200' });
        const widthPropNode = builder.createNode('setProperty', 600, 400, { 
            exposeProperty: true, 
            groupName: 'Size' 
        });

        // Row 4: Height property
        const heightNameNode = builder.createNode('string', 850, 350, { value: 'height' });
        const heightValueNode = builder.createNode('number', 850, 500, { value: '150' });
        const heightPropNode = builder.createNode('setProperty', 1100, 400, { 
            exposeProperty: true, 
            groupName: 'Size' 
        });

        // Row 5: Color property
        const colorNameNode = builder.createNode('string', 350, 650, { value: 'fillColor' });
        const colorValueNode = builder.createNode('color', 350, 800, { value: '#FF5722' });
        const colorPropNode = builder.createNode('setProperty', 600, 700, { 
            exposeProperty: true, 
            groupName: 'Style' 
        });

        // Drawing section - Draw event
        const drawNode = builder.createNode('draw', 100, 1000, {});

        // Property name strings for getProperty nodes
        const xPropNameNode = builder.createNode('string', 350, 1100, { value: 'x' });
        const yPropNameNode = builder.createNode('string', 350, 1250, { value: 'y' });
        const widthPropNameNode = builder.createNode('string', 350, 1400, { value: 'width' });
        const heightPropNameNode = builder.createNode('string', 350, 1550, { value: 'height' });
        const colorPropNameNode = builder.createNode('string', 350, 1700, { value: 'fillColor' });

        // Get properties
        const getXNode = builder.createNode('getProperty', 600, 1100, {});
        const getYNode = builder.createNode('getProperty', 600, 1250, {});
        const getWidthNode = builder.createNode('getProperty', 600, 1400, {});
        const getHeightNode = builder.createNode('getProperty', 600, 1550, {});
        const getColorNode = builder.createNode('getProperty', 600, 1700, {});

        // fillRect call
        const fillRectNode = builder.createNode('fillRect', 850, 1300, {});

        // Add all nodes
        nodes.push(
            startNode,
            xNameNode, xValueNode, xPropNode,
            yNameNode, yValueNode, yPropNode,
            widthNameNode, widthValueNode, widthPropNode,
            heightNameNode, heightValueNode, heightPropNode,
            colorNameNode, colorValueNode, colorPropNode,
            drawNode,
            xPropNameNode, yPropNameNode, widthPropNameNode, heightPropNameNode, colorPropNameNode,
            getXNode, getYNode, getWidthNode, getHeightNode, getColorNode,
            fillRectNode
        );

        // Flow connections - start -> properties chain
        connections.push(
            { from: startNode.id, fromPort: 0, to: xPropNode.id, toPort: 0 },
            { from: xPropNode.id, fromPort: 0, to: yPropNode.id, toPort: 0 },
            { from: yPropNode.id, fromPort: 0, to: widthPropNode.id, toPort: 0 },
            { from: widthPropNode.id, fromPort: 0, to: heightPropNode.id, toPort: 0 },
            { from: heightPropNode.id, fromPort: 0, to: colorPropNode.id, toPort: 0 }
        );

        // Property setup data connections
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

        // Drawing flow and data connections
        // fillRect inputs: ['flow', 'ctx', 'x', 'y', 'w', 'h', 'color']
        connections.push(
            { from: drawNode.id, fromPort: 0, to: fillRectNode.id, toPort: 0 }, // flow
            { from: drawNode.id, fromPort: 1, to: fillRectNode.id, toPort: 1 }, // ctx
            { from: getXNode.id, fromPort: 0, to: fillRectNode.id, toPort: 2 }, // x
            { from: getYNode.id, fromPort: 0, to: fillRectNode.id, toPort: 3 }, // y
            { from: getWidthNode.id, fromPort: 0, to: fillRectNode.id, toPort: 4 }, // w
            { from: getHeightNode.id, fromPort: 0, to: fillRectNode.id, toPort: 5 }, // h
            { from: getColorNode.id, fromPort: 0, to: fillRectNode.id, toPort: 6 } // color
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
        const xNameNode = builder.createNode('string', 350, 50, { value: 'x' });
        const xValueNode = builder.createNode('number', 350, 200, { value: '400' });
        const xPropNode = builder.createNode('setProperty', 600, 100, {});

        // Initialize Y
        const yNameNode = builder.createNode('string', 850, 50, { value: 'y' });
        const yValueNode = builder.createNode('number', 850, 200, { value: '100' });
        const yPropNode = builder.createNode('setProperty', 1100, 100, {});

        // Initialize velocityY
        const vyNameNode = builder.createNode('string', 1350, 50, { value: 'velocityY' });
        const vyValueNode = builder.createNode('number', 1350, 200, { value: '0' });
        const vyPropNode = builder.createNode('setProperty', 1600, 100, {});

        // Loop event
        const loopNode = builder.createNode('loop', 100, 400, {});
        
        // Update Y position - get current Y and velocityY
        const getYNameNode = builder.createNode('string', 350, 450, { value: 'y' });
        const getVYNameNode = builder.createNode('string', 350, 600, { value: 'velocityY' });
        const getYNode = builder.createNode('getProperty', 600, 450, {});
        const getVYNode = builder.createNode('getProperty', 600, 600, {});
        
        // Add them together
        const addYNode = builder.createNode('add', 850, 500, {});
        
        // Set new Y
        const setYNameNode = builder.createNode('string', 1100, 450, { value: 'y' });
        const setYNode = builder.createNode('setProperty', 1350, 500, {});

        // Apply gravity - get velocityY, add gravity, set velocityY
        const getVY2NameNode = builder.createNode('string', 350, 750, { value: 'velocityY' });
        const getVYNode2 = builder.createNode('getProperty', 600, 750, {});
        const gravityNode = builder.createNode('number', 850, 750, { value: '0.5' });
        const addGravityNode = builder.createNode('add', 1100, 750, {});
        const setVYNameNode = builder.createNode('string', 1350, 700, { value: 'velocityY' });
        const setVYNode = builder.createNode('setProperty', 1600, 750, {});

        // Draw event
        const drawNode = builder.createNode('draw', 100, 1100, {});
        
        // Get draw properties
        const getXDrawNameNode = builder.createNode('string', 350, 1150, { value: 'x' });
        const getYDrawNameNode = builder.createNode('string', 350, 1300, { value: 'y' });
        const getDrawXNode = builder.createNode('getProperty', 600, 1150, {});
        const getDrawYNode = builder.createNode('getProperty', 600, 1300, {});
        const sizeNode = builder.createNode('number', 850, 1200, { value: '20' });
        const drawColorNode = builder.createNode('color', 850, 1350, { value: '#2196F3' });
        const fillCircleNode = builder.createNode('fillCircle', 1100, 1250, {});

        nodes.push(
            startNode, 
            xNameNode, xValueNode, xPropNode,
            yNameNode, yValueNode, yPropNode,
            vyNameNode, vyValueNode, vyPropNode,
            loopNode, 
            getYNameNode, getVYNameNode, getYNode, getVYNode, addYNode, setYNameNode, setYNode,
            getVY2NameNode, getVYNode2, gravityNode, addGravityNode, setVYNameNode, setVYNode,
            drawNode, 
            getXDrawNameNode, getYDrawNameNode, getDrawXNode, getDrawYNode, sizeNode, drawColorNode, fillCircleNode
        );

        // Start flow connections
        connections.push(
            { from: startNode.id, fromPort: 0, to: xPropNode.id, toPort: 0 },
            { from: xPropNode.id, fromPort: 0, to: yPropNode.id, toPort: 0 },
            { from: yPropNode.id, fromPort: 0, to: vyPropNode.id, toPort: 0 }
        );

        // Start data connections
        connections.push(
            { from: xNameNode.id, fromPort: 0, to: xPropNode.id, toPort: 1 },
            { from: xValueNode.id, fromPort: 0, to: xPropNode.id, toPort: 2 },
            { from: yNameNode.id, fromPort: 0, to: yPropNode.id, toPort: 1 },
            { from: yValueNode.id, fromPort: 0, to: yPropNode.id, toPort: 2 },
            { from: vyNameNode.id, fromPort: 0, to: vyPropNode.id, toPort: 1 },
            { from: vyValueNode.id, fromPort: 0, to: vyPropNode.id, toPort: 2 }
        );

        // Loop flow connections
        connections.push(
            { from: loopNode.id, fromPort: 0, to: setYNode.id, toPort: 0 },
            { from: setYNode.id, fromPort: 0, to: setVYNode.id, toPort: 0 }
        );

        // Loop data connections - update Y
        // add inputs: ['a', 'b'], outputs: ['result']
        connections.push(
            { from: getYNameNode.id, fromPort: 0, to: getYNode.id, toPort: 0 },
            { from: getVYNameNode.id, fromPort: 0, to: getVYNode.id, toPort: 0 },
            { from: getYNode.id, fromPort: 0, to: addYNode.id, toPort: 0 }, // a
            { from: getVYNode.id, fromPort: 0, to: addYNode.id, toPort: 1 }, // b
            { from: setYNameNode.id, fromPort: 0, to: setYNode.id, toPort: 1 },
            { from: addYNode.id, fromPort: 0, to: setYNode.id, toPort: 2 }
        );

        // Loop data connections - apply gravity
        connections.push(
            { from: getVY2NameNode.id, fromPort: 0, to: getVYNode2.id, toPort: 0 },
            { from: getVYNode2.id, fromPort: 0, to: addGravityNode.id, toPort: 0 }, // a
            { from: gravityNode.id, fromPort: 0, to: addGravityNode.id, toPort: 1 }, // b
            { from: setVYNameNode.id, fromPort: 0, to: setVYNode.id, toPort: 1 },
            { from: addGravityNode.id, fromPort: 0, to: setVYNode.id, toPort: 2 }
        );

        // Draw flow and data connections
        // fillCircle inputs: ['flow', 'ctx', 'x', 'y', 'radius', 'color']
        connections.push(
            { from: drawNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 0 }, // flow
            { from: drawNode.id, fromPort: 1, to: fillCircleNode.id, toPort: 1 }, // ctx
            { from: getXDrawNameNode.id, fromPort: 0, to: getDrawXNode.id, toPort: 0 },
            { from: getYDrawNameNode.id, fromPort: 0, to: getDrawYNode.id, toPort: 0 },
            { from: getDrawXNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 2 }, // x
            { from: getDrawYNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 3 }, // y
            { from: sizeNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 4 }, // radius
            { from: drawColorNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 5 } // color
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
        const rotNameNode = builder.createNode('string', 350, 50, { value: 'rotation' });
        const rotValueNode = builder.createNode('number', 350, 200, { value: '0' });
        const rotPropNode = builder.createNode('setProperty', 600, 100, {});

        // Initialize speed
        const speedNameNode = builder.createNode('string', 850, 50, { value: 'rotationSpeed' });
        const speedValueNode = builder.createNode('number', 850, 200, { value: '0.05' });
        const speedPropNode = builder.createNode('setProperty', 1100, 100, { 
            exposeProperty: true, 
            groupName: 'Rotation' 
        });

        const loopNode = builder.createNode('loop', 100, 400, {});
        
        // Update rotation - get rotation and speed
        const getRotNameNode = builder.createNode('string', 350, 450, { value: 'rotation' });
        const getSpeedNameNode = builder.createNode('string', 350, 600, { value: 'rotationSpeed' });
        const getRotNode = builder.createNode('getProperty', 600, 450, {});
        const getSpeedNode = builder.createNode('getProperty', 600, 600, {});
        
        // Add them
        const addRotNode = builder.createNode('add', 850, 500, {});
        
        // Set new rotation
        const setRotNameNode = builder.createNode('string', 1100, 450, { value: 'rotation' });
        const setRotNode = builder.createNode('setProperty', 1350, 500, {});

        // Apply to game object - get rotation and set angle
        const getRotForGONameNode = builder.createNode('string', 1600, 500, { value: 'rotation' });
        const getRotForGONode = builder.createNode('getProperty', 1850, 500, {});
        const gameObjRotNode = builder.createNode('setAngle', 2100, 500, {});

        nodes.push(
            startNode, 
            rotNameNode, rotValueNode, rotPropNode,
            speedNameNode, speedValueNode, speedPropNode,
            loopNode, 
            getRotNameNode, getSpeedNameNode, getRotNode, getSpeedNode, addRotNode,
            setRotNameNode, setRotNode, 
            getRotForGONameNode, getRotForGONode, gameObjRotNode
        );

        // Start flow
        connections.push(
            { from: startNode.id, fromPort: 0, to: rotPropNode.id, toPort: 0 },
            { from: rotPropNode.id, fromPort: 0, to: speedPropNode.id, toPort: 0 }
        );

        // Start data
        connections.push(
            { from: rotNameNode.id, fromPort: 0, to: rotPropNode.id, toPort: 1 },
            { from: rotValueNode.id, fromPort: 0, to: rotPropNode.id, toPort: 2 },
            { from: speedNameNode.id, fromPort: 0, to: speedPropNode.id, toPort: 1 },
            { from: speedValueNode.id, fromPort: 0, to: speedPropNode.id, toPort: 2 }
        );

        // Loop flow
        connections.push(
            { from: loopNode.id, fromPort: 0, to: setRotNode.id, toPort: 0 },
            { from: setRotNode.id, fromPort: 0, to: gameObjRotNode.id, toPort: 0 }
        );

        // Loop data
        connections.push(
            { from: getRotNameNode.id, fromPort: 0, to: getRotNode.id, toPort: 0 },
            { from: getSpeedNameNode.id, fromPort: 0, to: getSpeedNode.id, toPort: 0 },
            { from: getRotNode.id, fromPort: 0, to: addRotNode.id, toPort: 0 },
            { from: getSpeedNode.id, fromPort: 0, to: addRotNode.id, toPort: 1 },
            { from: setRotNameNode.id, fromPort: 0, to: setRotNode.id, toPort: 1 },
            { from: addRotNode.id, fromPort: 0, to: setRotNode.id, toPort: 2 },
            { from: getRotForGONameNode.id, fromPort: 0, to: getRotForGONode.id, toPort: 0 },
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
        const counterNameNode = builder.createNode('string', 350, 50, { value: 'clickCount' });
        const counterValueNode = builder.createNode('number', 350, 200, { value: '0' });
        const counterPropNode = builder.createNode('setProperty', 600, 100, { 
            exposeProperty: true, 
            groupName: 'Display' 
        });

        const drawNode = builder.createNode('draw', 100, 400, {});
        
        // Get counter value
        const countPropNameNode = builder.createNode('string', 350, 450, { value: 'clickCount' });
        const getCountNode = builder.createNode('getProperty', 600, 450, {});
        
        // Draw text position and style
        const xPosNode = builder.createNode('number', 850, 400, { value: '10' });
        const yPosNode = builder.createNode('number', 850, 550, { value: '30' });
        const colorNode = builder.createNode('color', 1100, 450, { value: '#FFFFFF' });
        const drawTextNode = builder.createNode('drawText', 1350, 500, {});

        nodes.push(
            startNode, 
            counterNameNode, counterValueNode, counterPropNode,
            drawNode, 
            countPropNameNode, getCountNode, 
            xPosNode, yPosNode, colorNode, drawTextNode
        );

        // Start flow
        connections.push(
            { from: startNode.id, fromPort: 0, to: counterPropNode.id, toPort: 0 }
        );

        // Start data
        connections.push(
            { from: counterNameNode.id, fromPort: 0, to: counterPropNode.id, toPort: 1 },
            { from: counterValueNode.id, fromPort: 0, to: counterPropNode.id, toPort: 2 }
        );

        // Draw flow and data
        // drawText inputs: ['flow', 'ctx', 'text', 'x', 'y', 'color']
        connections.push(
            { from: drawNode.id, fromPort: 0, to: drawTextNode.id, toPort: 0 }, // flow
            { from: drawNode.id, fromPort: 1, to: drawTextNode.id, toPort: 1 }, // ctx
            { from: countPropNameNode.id, fromPort: 0, to: getCountNode.id, toPort: 0 },
            { from: getCountNode.id, fromPort: 0, to: drawTextNode.id, toPort: 2 }, // text
            { from: xPosNode.id, fromPort: 0, to: drawTextNode.id, toPort: 3 }, // x
            { from: yPosNode.id, fromPort: 0, to: drawTextNode.id, toPort: 4 }, // y
            { from: colorNode.id, fromPort: 0, to: drawTextNode.id, toPort: 5 } // color
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
        const hueNameNode = builder.createNode('string', 350, 50, { value: 'hue' });
        const hueValueNode = builder.createNode('number', 350, 200, { value: '0' });
        const huePropNode = builder.createNode('setProperty', 600, 100, {});

        // Initialize speed
        const speedNameNode = builder.createNode('string', 850, 50, { value: 'cycleSpeed' });
        const speedValueNode = builder.createNode('number', 850, 200, { value: '1' });
        const speedPropNode = builder.createNode('setProperty', 1100, 100, { 
            exposeProperty: true, 
            groupName: 'Animation' 
        });

        const loopNode = builder.createNode('loop', 100, 400, {});
        
        // Update hue - get hue and speed
        const getHueNameNode = builder.createNode('string', 350, 450, { value: 'hue' });
        const getSpeedNameNode = builder.createNode('string', 350, 600, { value: 'cycleSpeed' });
        const getHueNode = builder.createNode('getProperty', 600, 450, {});
        const getSpeedNode = builder.createNode('getProperty', 600, 600, {});
        
        // Add them
        const addHueNode = builder.createNode('add', 850, 500, {});
        
        // Modulo to wrap around 360
        const maxHueNode = builder.createNode('number', 1100, 450, { value: '360' });
        const moduloNode = builder.createNode('modulo', 1100, 550, {});
        
        // Set new hue
        const setHueNameNode = builder.createNode('string', 1350, 500, { value: 'hue' });
        const setHueNode = builder.createNode('setProperty', 1600, 550, {});

        const drawNode = builder.createNode('draw', 100, 900, {});
        
        // Draw circle with fixed color (simplified - hue-to-color conversion would be more complex)
        const xNode = builder.createNode('number', 350, 950, { value: '0' });
        const yNode = builder.createNode('number', 350, 1100, { value: '0' });
        const radiusNode = builder.createNode('number', 600, 950, { value: '30' });
        const colorNode = builder.createNode('color', 600, 1100, { value: '#FF00FF' });
        const fillCircleNode = builder.createNode('fillCircle', 850, 1000, {});

        nodes.push(
            startNode, 
            hueNameNode, hueValueNode, huePropNode,
            speedNameNode, speedValueNode, speedPropNode,
            loopNode, 
            getHueNameNode, getSpeedNameNode, getHueNode, getSpeedNode, addHueNode,
            maxHueNode, moduloNode, setHueNameNode, setHueNode,
            drawNode, 
            xNode, yNode, radiusNode, colorNode, fillCircleNode
        );

        // Start flow
        connections.push(
            { from: startNode.id, fromPort: 0, to: huePropNode.id, toPort: 0 },
            { from: huePropNode.id, fromPort: 0, to: speedPropNode.id, toPort: 0 }
        );

        // Start data
        connections.push(
            { from: hueNameNode.id, fromPort: 0, to: huePropNode.id, toPort: 1 },
            { from: hueValueNode.id, fromPort: 0, to: huePropNode.id, toPort: 2 },
            { from: speedNameNode.id, fromPort: 0, to: speedPropNode.id, toPort: 1 },
            { from: speedValueNode.id, fromPort: 0, to: speedPropNode.id, toPort: 2 }
        );

        // Loop flow
        connections.push(
            { from: loopNode.id, fromPort: 0, to: setHueNode.id, toPort: 0 }
        );

        // Loop data
        // modulo inputs: ['a', 'b'], outputs: ['result']
        connections.push(
            { from: getHueNameNode.id, fromPort: 0, to: getHueNode.id, toPort: 0 },
            { from: getSpeedNameNode.id, fromPort: 0, to: getSpeedNode.id, toPort: 0 },
            { from: getHueNode.id, fromPort: 0, to: addHueNode.id, toPort: 0 },
            { from: getSpeedNode.id, fromPort: 0, to: addHueNode.id, toPort: 1 },
            { from: addHueNode.id, fromPort: 0, to: moduloNode.id, toPort: 0 }, // a
            { from: maxHueNode.id, fromPort: 0, to: moduloNode.id, toPort: 1 }, // b
            { from: setHueNameNode.id, fromPort: 0, to: setHueNode.id, toPort: 1 },
            { from: moduloNode.id, fromPort: 0, to: setHueNode.id, toPort: 2 }
        );

        // Draw flow and data
        // fillCircle inputs: ['flow', 'ctx', 'x', 'y', 'radius', 'color']
        connections.push(
            { from: drawNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 0 }, // flow
            { from: drawNode.id, fromPort: 1, to: fillCircleNode.id, toPort: 1 }, // ctx
            { from: xNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 2 }, // x
            { from: yNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 3 }, // y
            { from: radiusNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 4 }, // radius
            { from: colorNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 5 } // color
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
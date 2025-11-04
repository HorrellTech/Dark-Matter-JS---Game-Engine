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
            const nodeLibrary = this._getMinimalNodeLibrary();
            
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
     * Helper: Get minimal node library for standalone use
     */
    static _getMinimalNodeLibrary() {
        // Just use the full library
        return this.buildNodeLibrary();
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

    /**
     * Build the node library with all available node types
     */
   static buildNodeLibrary() {
        return {
            'Events': [
                {
                    type: 'start',
                    label: 'Start',
                    color: '#2d4a2d',
                    icon: 'fas fa-play',
                    outputs: ['flow'],
                    codeGen: (node, ctx) => ''
                },
                {
                    type: 'loop',
                    label: 'Loop',
                    color: '#2a3341',
                    icon: 'fas fa-rotate',
                    outputs: ['flow', 'deltaTime'],
                    codeGen: (node, ctx) => ''
                },
                {
                    type: 'draw',
                    label: 'Draw',
                    color: '#3d2626',
                    icon: 'fas fa-paintbrush',
                    outputs: ['flow', 'ctx'],
                    codeGen: (node, ctx) => ''
                },
                {
                    type: 'onDestroy',
                    label: 'On Destroy',
                    color: '#4a3d2a',
                    icon: 'fas fa-skull-crossbones',
                    outputs: ['flow'],
                    codeGen: (node, ctx) => ''
                },
                {
                    type: 'method',
                    label: 'Method Block',
                    color: '#3d4026',
                    icon: 'fas fa-cube',
                    inputs: [],
                    outputs: ['flow'],
                    hasInput: true,
                    isGroup: true,
                    codeGen: (node, ctx) => ''
                },
            ],
            'Variables': [
                {
                    type: 'const',
                    label: 'Local Const',
                    color: '#0d3d5c',
                    icon: 'fas fa-lock',
                    inputs: ['flow', 'name', 'value'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    hasInput: true,
                    codeGen: (node, ctx) => {
                        let varName = ctx.getInputValue(node, 'name', false);
                        // Extract from quotes if it's a string literal
                        if (typeof varName === 'string' && /^['"].*['"]$/.test(varName)) {
                            varName = varName.slice(1, -1);
                        }
                        varName = varName || 'myConst';
                        const varValue = ctx.getInputValue(node, 'value') || 'null';
                        return `const ${varName} = ${varValue};`;
                    }
                },
                {
                    type: 'let',
                    label: 'Local Let',
                    color: '#194263',
                    icon: 'fas fa-unlock',
                    inputs: ['flow', 'name', 'value'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    hasInput: true,
                    codeGen: (node, ctx) => {
                        let varName = ctx.getInputValue(node, 'name', false);
                        if (typeof varName === 'string' && /^['"].*['"]$/.test(varName)) {
                            varName = varName.slice(1, -1);
                        }
                        varName = varName || 'myVar';
                        const varValue = ctx.getInputValue(node, 'value') || 'null';
                        return `let ${varName} = ${varValue};`;
                    }
                },
                {
                    type: 'var',
                    label: 'Local Var',
                    color: '#3d5c26',
                    icon: 'fas fa-cube',
                    inputs: ['flow', 'name', 'value'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    hasInput: true,
                    codeGen: (node, ctx) => {
                        let varName = ctx.getInputValue(node, 'name', false);
                        if (typeof varName === 'string' && /^['"].*['"]$/.test(varName)) {
                            varName = varName.slice(1, -1);
                        }
                        varName = varName || 'myVar';
                        const varValue = ctx.getInputValue(node, 'value') || 'null';
                        return `var ${varName} = ${varValue};`;
                    }
                },
                {
                    type: 'getVariable',
                    label: 'Get Local Variable',
                    color: '#26476a',
                    icon: 'fas fa-arrow-right',
                    inputs: ['name'],
                    outputs: ['value'],
                    codeGen: (node, ctx) => {
                        let varName = ctx.getInputValue(node, 'name', false);
                        if (typeof varName === 'string' && /^['"].*['"]$/.test(varName)) {
                            varName = varName.slice(1, -1);
                        }
                        varName = varName || 'myVar';
                        return `(${varName} !== undefined ? ${varName} : variables['${varName}'])`;
                    }
                },
                {
                    type: 'setVariable',
                    label: 'Set Local Variable',
                    color: '#26476a',
                    icon: 'fas fa-arrow-left',
                    inputs: ['flow', 'name', 'value'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => {
                        let varName = ctx.getInputValue(node, 'name', false);
                        if (typeof varName === 'string' && /^['"].*['"]$/.test(varName)) {
                            varName = varName.slice(1, -1);
                        }
                        varName = varName || 'myVar';
                        const varValue = ctx.getInputValue(node, 'value') || 'null';
                        return `(${varName} = ${varValue})`;
                    }
                },
                {
                    type: 'getProperty',
                    label: 'Get Property',
                    color: '#26476a',
                    icon: 'fas fa-arrow-right',
                    inputs: ['name'],
                    outputs: ['value'],
                    codeGen: (node, ctx) => {
                        // Get the raw value without cleaning
                        let propName = ctx.getInputValue(node, 'name', false);
                        
                        // If it's a string literal (wrapped in quotes), extract the content
                        if (typeof propName === 'string' && /^['"].*['"]$/.test(propName)) {
                            propName = propName.slice(1, -1); // Remove quotes
                        }
                        
                        // Validate it's a valid identifier
                        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(propName)) {
                            propName = 'property'; // fallback to default if invalid
                        }
                        
                        return `(this.${propName} !== undefined ? this.${propName} : this.properties['${propName}'])`;
                    }
                },
                {
                    type: 'setProperty',
                    label: 'Set Property',
                    color: '#334d71',
                    icon: 'fas fa-arrow-left',
                    inputs: ['flow', 'name', 'value'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    hasExposeCheckbox: true,
                    codeGen: (node, ctx) => {
                        // Get the raw value without cleaning
                        let propName = ctx.getInputValue(node, 'name', false);
                        
                        // If it's a string literal (wrapped in quotes), extract the content
                        if (typeof propName === 'string' && /^['"].*['"]$/.test(propName)) {
                            propName = propName.slice(1, -1); // Remove quotes
                        }
                        
                        // Validate it's a valid identifier, use default if invalid
                        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(propName)) {
                            propName = 'property';
                        }
                        
                        const propValue = ctx.getInputValue(node, 'value');

                        if (node.exposeProperty) {
                            return `this.${propName} = ${propValue};`;
                        } else {
                            return `this.properties['${propName}'] = ${propValue};`;
                        }
                    }
                }
            ],
            'Values': [
                {
                    type: 'number',
                    label: 'Number',
                    color: '#405278',
                    icon: 'fas fa-hashtag',
                    inputs: [],
                    outputs: ['value'],
                    hasInput: true,
                    codeGen: (node, ctx) => node.value || '0'
                },
                {
                    type: 'string',
                    label: 'String',
                    color: '#4d577f',
                    icon: 'fas fa-quote-right',
                    inputs: [],
                    outputs: ['value'],
                    hasInput: true,
                    codeGen: (node, ctx) => `'${node.value || ''}'`
                },
                {
                    type: 'boolean',
                    label: 'Boolean',
                    color: '#0a2f4d',
                    icon: 'fas fa-toggle-on',
                    inputs: [],
                    outputs: ['value'],
                    hasToggle: true,
                    codeGen: (node, ctx) => node.value ? 'true' : 'false'
                },
                {
                    type: 'color',
                    label: 'Color',
                    color: '#444444ff',
                    icon: 'fas fa-palette',
                    inputs: [],
                    outputs: ['value'],
                    hasColorPicker: true,
                    codeGen: (node, ctx) => `'${node.value || '#ffffff'}'`
                },
                {
                    type: 'null',
                    label: 'Null',
                    color: '#000000ff',
                    icon: 'fas fa-ban',
                    inputs: [],
                    outputs: ['value'],
                    codeGen: (node, ctx) => 'null'
                },
                {
                    type: 'undefined',
                    label: 'Undefined',
                    color: '#000000',
                    icon: 'fas fa-ban',
                    inputs: [],
                    outputs: ['value'],
                    codeGen: (node, ctx) => 'undefined'
                },
                {
                    type: 'infinity',
                    label: 'Infinity',
                    color: '#000000',
                    icon: 'fas fa-infinity',
                    inputs: [],
                    outputs: ['value'],
                    codeGen: (node, ctx) => 'Infinity'
                },
                {
                    type: 'negativeInfinity',
                    label: 'Negative Infinity',
                    color: '#000000',
                    icon: 'fas fa-infinity',
                    inputs: [],
                    outputs: ['value'],
                    codeGen: (node, ctx) => '-Infinity'
                }
            ],
            'Logic': [
                {
                    type: 'if',
                    label: 'If',
                    color: '#663d00',
                    icon: 'fas fa-code-branch',
                    inputs: ['flow', 'condition'],
                    outputs: ['true', 'false'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `if (${ctx.getInputValue(node, 'condition')})`
                },
                {
                    type: 'compare',
                    label: 'Compare',
                    color: '#6b4410',
                    icon: 'fas fa-balance-scale',
                    inputs: ['a', 'b'],
                    outputs: ['==', '!=', '>', '<', '>=', '<='],
                    hasDropdown: true,
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} ${node.dropdownValue || '=='} ${ctx.getInputValue(node, 'b')}`
                },
                {
                    type: 'and',
                    label: 'AND',
                    color: '#704a1f',
                    icon: 'fas fa-link',
                    inputs: ['a', 'b'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} && ${ctx.getInputValue(node, 'b')}`
                },
                {
                    type: 'or',
                    label: 'OR',
                    color: '#75502e',
                    icon: 'fas fa-plus',
                    inputs: ['a', 'b'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} || ${ctx.getInputValue(node, 'b')}`
                },
                {
                    type: 'not',
                    label: 'NOT',
                    color: '#7a563d',
                    icon: 'fas fa-ban',
                    inputs: ['value'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `!(${ctx.getInputValue(node, 'value')})`
                },
                {
                    type: 'return',
                    label: 'Return',
                    color: '#663300',
                    icon: 'fas fa-reply',
                    inputs: ['flow', 'value'],
                    outputs: [],
                    codeGen: (node, ctx) => `return ${ctx.getInputValue(node, 'value')};`
                }
            ],
            'Loops & Control': [
                {
                    type: 'forLoop',
                    label: 'For Loop',
                    color: '#5a3d1f',
                    icon: 'fas fa-repeat',
                    inputs: ['flow', 'start', 'end'],
                    outputs: ['flow', 'index'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => {
                        const start = ctx.getInputValue(node, 'start') || '0';
                        const end = ctx.getInputValue(node, 'end') || '10';
                        return `for(let i = ${start}; i < ${end}; i++)`;
                    }
                },
                {
                    type: 'whileLoop',
                    label: 'While Loop',
                    color: '#6b4a2f',
                    icon: 'fas fa-sync',
                    inputs: ['flow', 'condition'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `while(${ctx.getInputValue(node, 'condition')})`
                },
                {
                    type: 'break',
                    label: 'Break',
                    color: '#7a5640',
                    icon: 'fas fa-stop',
                    inputs: ['flow'],
                    outputs: [],
                    codeGen: (node, ctx) => 'break;'
                },
                {
                    type: 'continue',
                    label: 'Continue',
                    color: '#896350',
                    icon: 'fas fa-forward',
                    inputs: ['flow'],
                    outputs: [],
                    codeGen: (node, ctx) => 'continue;'
                }
            ],
            'Modules': [
                {
                    type: 'getModule',
                    label: 'Get Module',
                    color: '#681d75ff',
                    icon: 'fas fa-puzzle-piece',
                    inputs: ['flow', 'name'],
                    outputs: ['flow', 'module'],
                    wrapFlowNode: false,
                    hasInput: true,
                    defaultValue: 'ModuleName',
                    codeGen: (node, ctx) => {
                        const moduleName = ctx.getInputValue(node, 'name') || 'ModuleName';
                        return `this.gameObject.getModule('${moduleName}')`;
                    }
                },
                {
                    type: 'require',
                    label: 'Require',
                    color: '#4a2f4eff',
                    icon: 'fas fa-plug',
                    inputs: ['name'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    hasInput: true,
                    defaultValue: 'ModuleName',
                    codeGen: (node, ctx) => {
                        const moduleName = ctx.getInputValue(node, 'name') || node.value || 'ModuleName';
                        return `require('${moduleName}')`;
                    }
                }
            ],
            'Math': [
                {
                    type: 'add',
                    label: 'Add',
                    color: '#3d0f47',
                    icon: 'fas fa-plus',
                    inputs: ['a', 'b'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} + ${ctx.getInputValue(node, 'b')}`
                },
                {
                    type: 'subtract',
                    label: 'Subtract',
                    color: '#44194e',
                    icon: 'fas fa-minus',
                    inputs: ['a', 'b'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} - ${ctx.getInputValue(node, 'b')}`
                },
                {
                    type: 'multiply',
                    label: 'Multiply',
                    color: '#4b2355',
                    icon: 'fas fa-xmark',
                    inputs: ['a', 'b'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} * ${ctx.getInputValue(node, 'b')}`
                },
                {
                    type: 'divide',
                    label: 'Divide',
                    color: '#522d5c',
                    icon: 'fas fa-divide',
                    inputs: ['a', 'b'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} / ${ctx.getInputValue(node, 'b')}`
                },
                {
                    type: 'modulo',
                    label: 'Modulo',
                    color: '#593763',
                    icon: 'fas fa-percent',
                    inputs: ['a', 'b'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} % ${ctx.getInputValue(node, 'b')}`
                },
                {
                    type: 'random',
                    label: 'Random',
                    color: '#60416a',
                    icon: 'fas fa-dice',
                    inputs: ['min', 'max'],
                    outputs: ['value'],
                    codeGen: (node, ctx) => `(Math.random() * (${ctx.getInputValue(node, 'max')} - ${ctx.getInputValue(node, 'min')}) + ${ctx.getInputValue(node, 'min')})`
                },
                {
                    type: 'abs',
                    label: 'Absolute',
                    color: '#360d40',
                    icon: 'fas fa-arrows-left-right',
                    inputs: ['value'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `Math.abs(${ctx.getInputValue(node, 'value')})`
                },
                {
                    type: 'sqrt',
                    label: 'Square Root',
                    color: '#2e0936',
                    icon: 'fas fa-square-root-alt',
                    inputs: ['value'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `Math.sqrt(${ctx.getInputValue(node, 'value')})`
                },
                {
                    type: 'pow',
                    label: 'Power',
                    color: '#26082c',
                    icon: 'fas fa-superscript',
                    inputs: ['base', 'exp'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `Math.pow(${ctx.getInputValue(node, 'base')}, ${ctx.getInputValue(node, 'exp')})`
                },
                {
                    type: 'sin',
                    label: 'Sine',
                    color: '#1e0624',
                    icon: 'fas fa-wave-square',
                    inputs: ['angle'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `Math.sin(${ctx.getInputValue(node, 'angle')})`
                },
                {
                    type: 'cos',
                    label: 'Cosine',
                    color: '#14001a',
                    icon: 'fas fa-wave-square',
                    inputs: ['angle'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `Math.cos(${ctx.getInputValue(node, 'angle')})`
                },
                {
                    type: 'min',
                    label: 'Min',
                    color: '#1e0924',
                    icon: 'fas fa-arrow-down',
                    inputs: ['a', 'b'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `Math.min(${ctx.getInputValue(node, 'a')}, ${ctx.getInputValue(node, 'b')})`
                },
                {
                    type: 'max',
                    label: 'Max',
                    color: '#24102a',
                    icon: 'fas fa-arrow-up',
                    inputs: ['a', 'b'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `Math.max(${ctx.getInputValue(node, 'a')}, ${ctx.getInputValue(node, 'b')})`
                },
                {
                    type: 'clamp',
                    label: 'Clamp',
                    color: '#2a1630',
                    icon: 'fas fa-compress-arrows-alt',
                    inputs: ['value', 'min', 'max'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `Math.min(Math.max(${ctx.getInputValue(node, 'value')}, ${ctx.getInputValue(node, 'min')}), ${ctx.getInputValue(node, 'max')})`
                },
                {
                    type: 'floor',
                    label: 'Floor',
                    color: '#301c36',
                    icon: 'fas fa-angle-down',
                    inputs: ['value'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `Math.floor(${ctx.getInputValue(node, 'value')})`
                },
                {
                    type: 'ceil',
                    label: 'Ceil',
                    color: '#36223c',
                    icon: 'fas fa-angle-up',
                    inputs: ['value'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `Math.ceil(${ctx.getInputValue(node, 'value')})`
                },
                {
                    type: 'round',
                    label: 'Round',
                    color: '#3c2842',
                    icon: 'fas fa-circle-half-stroke',
                    inputs: ['value'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `Math.round(${ctx.getInputValue(node, 'value')})`
                },
                {
                    type: 'lerp',
                    label: 'Lerp',
                    color: '#422e48',
                    icon: 'fas fa-arrows-left-right',
                    inputs: ['from', 'to', 'amount'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `(${ctx.getInputValue(node, 'from')} + (${ctx.getInputValue(node, 'to')} - ${ctx.getInputValue(node, 'from')}) * ${ctx.getInputValue(node, 'amount')})`
                },
                {
                    type: 'tan',
                    label: 'Tangent',
                    color: '#0a0010',
                    icon: 'fas fa-wave-square',
                    inputs: ['angle'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `Math.tan(${ctx.getInputValue(node, 'angle')})`
                },
                {
                    type: 'atan2',
                    label: 'Atan2',
                    color: '#100016',
                    icon: 'fas fa-compass',
                    inputs: ['y', 'x'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `Math.atan2(${ctx.getInputValue(node, 'y')}, ${ctx.getInputValue(node, 'x')})`
                },
                {
                    type: 'vector2',
                    label: 'Vector2',
                    color: '#1e3c44ff',
                    icon: 'fas fa-arrows-alt',
                    inputs: ['name', 'x', 'y'],
                    outputs: ['x', 'y'],
                    hasInput: false,
                    codeGen: (node, ctx) => {
                        const x = ctx.getInputValue(node, 'x');
                        const y = ctx.getInputValue(node, 'y');
                        return `new Vector2(${x}, ${y})`;
                    },
                    multiOutputAccess: (baseValue, portName, node, ctx) => {
                        // If accessing .x or .y from the vector object
                        return `(${baseValue}).${portName}`;
                    }
                }
            ],
            'String': [
                {
                    type: 'stringConcat',
                    label: 'Concatenate',
                    color: '#3a3a5c',
                    icon: 'fas fa-link',
                    inputs: ['a', 'b'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} + ${ctx.getInputValue(node, 'b')}`
                },
                {
                    type: 'stringLength',
                    label: 'String Length',
                    color: '#444563',
                    icon: 'fas fa-ruler',
                    inputs: ['string'],
                    outputs: ['length'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'string')}.length`
                },
                {
                    type: 'stringToUpper',
                    label: 'To Uppercase',
                    color: '#4e506a',
                    icon: 'fas fa-arrow-up',
                    inputs: ['string'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'string')}.toUpperCase()`
                },
                {
                    type: 'stringToLower',
                    label: 'To Lowercase',
                    color: '#585b71',
                    icon: 'fas fa-arrow-down',
                    inputs: ['string'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'string')}.toLowerCase()`
                },
                {
                    type: 'stringSubstring',
                    label: 'Substring',
                    color: '#626678',
                    icon: 'fas fa-scissors',
                    inputs: ['string', 'start', 'end'],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'string')}.substring(${ctx.getInputValue(node, 'start')}, ${ctx.getInputValue(node, 'end')})`
                }
            ],
            'Time': [
                {
                    type: 'getDeltaTime',
                    label: 'Get Delta Time',
                    color: '#2a4a2a',
                    icon: 'fas fa-clock',
                    inputs: [],
                    outputs: ['deltaTime'],
                    codeGen: (node, ctx) => 'deltaTime'
                },
                {
                    type: 'getTimeScale',
                    label: 'Get Time Scale',
                    color: '#345535',
                    icon: 'fas fa-gauge',
                    inputs: [],
                    outputs: ['timeScale'],
                    codeGen: (node, ctx) => 'window.engine.timeScale'
                },
                {
                    type: 'setTimeScale',
                    label: 'Set Time Scale',
                    color: '#3e6040',
                    icon: 'fas fa-gauge-high',
                    inputs: ['flow', 'timeScale'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `window.engine.timeScale = ${ctx.getInputValue(node, 'timeScale')};`
                },
                {
                    type: 'isPaused',
                    label: 'Is Paused',
                    color: '#486b4b',
                    icon: 'fas fa-pause',
                    inputs: [],
                    outputs: ['result'],
                    codeGen: (node, ctx) => 'window.engine.paused'
                },
                {
                    type: 'pauseGame',
                    label: 'Pause Game',
                    color: '#527656',
                    icon: 'fas fa-pause-circle',
                    inputs: ['flow'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => 'window.engine.paused = true;'
                },
                {
                    type: 'resumeGame',
                    label: 'Resume Game',
                    color: '#5c8161',
                    icon: 'fas fa-play-circle',
                    inputs: ['flow'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => 'window.engine.paused = false;'
                }
            ],
            'Arrays': [
                {
                    type: 'createArray',
                    label: 'Create Array',
                    color: '#1a4a5a',
                    icon: 'fas fa-list',
                    inputs: ['flow', 'name'],
                    outputs: ['flow', 'array'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => '[]'
                },
                {
                    type: 'arrayPush',
                    label: 'Array Push',
                    color: '#245560',
                    icon: 'fas fa-plus-square',
                    inputs: ['flow', 'array', 'value'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'array')}.push(${ctx.getInputValue(node, 'value')});`
                },
                {
                    type: 'arrayPop',
                    label: 'Array Pop',
                    color: '#2e6066',
                    icon: 'fas fa-minus-square',
                    inputs: ['flow', 'array'],
                    outputs: ['flow', 'value'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'array')}.pop()`
                },
                {
                    type: 'arrayGet',
                    label: 'Array Get',
                    color: '#386b6c',
                    icon: 'fas fa-arrow-right',
                    inputs: ['array', 'index'],
                    outputs: ['value'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'array')}[${ctx.getInputValue(node, 'index')}]`
                },
                {
                    type: 'arraySet',
                    label: 'Array Set',
                    color: '#427672',
                    icon: 'fas fa-arrow-left',
                    inputs: ['flow', 'array', 'index', 'value'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'array')}[${ctx.getInputValue(node, 'index')}] = ${ctx.getInputValue(node, 'value')};`
                },
                {
                    type: 'arrayLength',
                    label: 'Array Length',
                    color: '#4c8178',
                    icon: 'fas fa-ruler-horizontal',
                    inputs: ['array'],
                    outputs: ['length'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'array')}.length`
                },
                {
                    type: 'arrayShift',
                    label: 'Array Shift',
                    color: '#568c7e',
                    icon: 'fas fa-chevron-left',
                    inputs: ['flow', 'array'],
                    outputs: ['flow', 'value'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'array')}.shift()`
                },
                {
                    type: 'arrayUnshift',
                    label: 'Array Unshift',
                    color: '#609784',
                    icon: 'fas fa-chevron-right',
                    inputs: ['flow', 'array', 'value'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'array')}.unshift(${ctx.getInputValue(node, 'value')});`
                }
            ],
            'Comparison': [
                {
                    type: 'equals',
                    label: 'Equals',
                    color: '#FFC107',
                    icon: 'fas fa-equals',
                    inputs: ['value', 'value'],
                    inputLabels: ['a', 'b'],
                    outputs: ['value'],
                    outputLabels: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} === ${ctx.getInputValue(node, 'b')}`
                },
                {
                    type: 'notEquals',
                    label: 'Not Equals',
                    color: '#FFC107',
                    icon: 'fas fa-not-equal',
                    inputs: ['value', 'value'],
                    inputLabels: ['a', 'b'],
                    outputs: ['value'],
                    outputLabels: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} !== ${ctx.getInputValue(node, 'b')}`
                },
                {
                    type: 'greaterThan',
                    label: 'Greater Than',
                    color: '#FFC107',
                    icon: 'fas fa-greater-than',
                    inputs: ['value', 'value'],
                    inputLabels: ['a', 'b'],
                    outputs: ['value'],
                    outputLabels: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} > ${ctx.getInputValue(node, 'b')}`
                },
                {
                    type: 'lessThan',
                    label: 'Less Than',
                    color: '#FFC107',
                    icon: 'fas fa-less-than',
                    inputs: ['value', 'value'],
                    inputLabels: ['a', 'b'],
                    outputs: ['value'],
                    outputLabels: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} < ${ctx.getInputValue(node, 'b')}`
                },
                {
                    type: 'greaterThanOrEqual',
                    label: 'Greater/Equal',
                    color: '#FFD700',
                    icon: 'fas fa-greater-than-equal',
                    inputs: ['value', 'value'],
                    inputLabels: ['a', 'b'],
                    outputs: ['value'],
                    outputLabels: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} >= ${ctx.getInputValue(node, 'b')}`
                },
                {
                    type: 'lessThanOrEqual',
                    label: 'Less/Equal',
                    color: '#FFD700',
                    icon: 'fas fa-less-than-equal',
                    inputs: ['value', 'value'],
                    inputLabels: ['a', 'b'],
                    outputs: ['value'],
                    outputLabels: ['result'],
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'a')} <= ${ctx.getInputValue(node, 'b')}`
                }
            ],
            'GameObject': [
                {
                    type: 'getPosition',
                    label: 'Get Position',
                    color: '#004d54',
                    icon: 'fas fa-location-dot',
                    inputs: [],
                    outputs: ['x', 'y'],
                    codeGen: (node, ctx) => {
                        // This node outputs multiple values, handled specially in code generation
                        return 'this.gameObject.position';
                    }
                },
                {
                    type: 'setPosition',
                    label: 'Set Position',
                    color: '#0a5259',
                    icon: 'fas fa-arrows-up-down-left-right',
                    inputs: ['flow', 'x', 'y'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `this.gameObject.position.x = ${ctx.getInputValue(node, 'x')};
${ctx.indent}this.gameObject.position.y = ${ctx.getInputValue(node, 'y')};`
                },
                {
                    type: 'getScale',
                    label: 'Get Scale',
                    color: '#14575e',
                    icon: 'fas fa-maximize',
                    inputs: [],
                    outputs: ['scaleX', 'scaleY'],
                    codeGen: (node, ctx) => {
                        // This node outputs multiple values, handled specially in code generation
                        return 'this.gameObject.scale';
                    }
                },
                {
                    type: 'setScale',
                    label: 'Set Scale',
                    color: '#1e5c63',
                    icon: 'fas fa-up-right-and-down-left-from-center',
                    inputs: ['flow', 'scaleX', 'scaleY'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `this.gameObject.scale.x = ${ctx.getInputValue(node, 'scaleX')};\n${ctx.indent}this.gameObject.scale.y = ${ctx.getInputValue(node, 'scaleY')};`
                },
                {
                    type: 'getAngle',
                    label: 'Get Angle',
                    color: '#286168',
                    icon: 'fas fa-rotate-right',
                    inputs: [],
                    outputs: ['angle'],
                    codeGen: (node, ctx) => `this.gameObject.angle`
                },
                {
                    type: 'setAngle',
                    label: 'Set Angle',
                    color: '#32666d',
                    icon: 'fas fa-rotate',
                    inputs: ['flow', 'angle'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `this.gameObject.angle = ${ctx.getInputValue(node, 'angle')};`
                },
                {
                    type: 'getModule',
                    label: 'Get Module',
                    color: '#004852',
                    icon: 'fas fa-puzzle-piece',
                    inputs: ['name'],
                    outputs: ['module'],
                    codeGen: (node, ctx) => `this.gameObject.getModule(${ctx.getInputValue(node, 'name')})`
                },
                {
                    type: 'addModule',
                    label: 'Add Module',
                    color: '#003d45',
                    icon: 'fas fa-plus-circle',
                    inputs: ['flow', 'name'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `this.gameObject.addModule(${ctx.getInputValue(node, 'name')})`
                },
                {
                    type: 'removeModule',
                    label: 'Remove Module',
                    color: '#003238',
                    icon: 'fas fa-minus-circle',
                    inputs: ['flow', 'name'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `this.gameObject.removeModule(${ctx.getInputValue(node, 'name')});`
                },
                {
                    type: 'findGameObject',
                    label: 'Find GameObject',
                    color: '#00272b',
                    icon: 'fas fa-search',
                    inputs: ['name'],
                    outputs: ['object'],
                    codeGen: (node, ctx) => `window.engine.findGameObject(${ctx.getInputValue(node, 'name')})`
                },
                {
                    type: 'instanceCreate',
                    label: 'Instance Create',
                    color: '#001c1e',
                    icon: 'fas fa-circle-plus',
                    inputs: ['flow', 'x', 'y', 'name'],
                    outputs: ['instance'],
                    codeGen: (node, ctx) => `this.instanceCreate(${ctx.getInputValue(node, 'x')}, ${ctx.getInputValue(node, 'y')}, ${ctx.getInputValue(node, 'name')})`
                },
                {
                    type: 'instanceDestroy',
                    label: 'Instance Destroy',
                    color: '#001417',
                    icon: 'fas fa-trash',
                    inputs: ['flow', 'object'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `${ctx.getInputValue(node, 'object')}.destroy();`
                },
                {
                    type: 'getName',
                    label: 'Get Name',
                    color: '#000f11',
                    icon: 'fas fa-tag',
                    inputs: [],
                    outputs: ['name'],
                    codeGen: (node, ctx) => `this.gameObject.name`
                },
                {
                    type: 'setName',
                    label: 'Set Name',
                    color: '#000a0b',
                    icon: 'fas fa-pen',
                    inputs: ['flow', 'name'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `this.gameObject.name = ${ctx.getInputValue(node, 'name')};`
                },
                {
                    type: 'getVisible',
                    label: 'Get Visible',
                    color: '#000510',
                    icon: 'fas fa-eye',
                    inputs: [],
                    outputs: ['visible'],
                    codeGen: (node, ctx) => `this.gameObject.visible`
                },
                {
                    type: 'setVisible',
                    label: 'Set Visible',
                    color: '#000a15',
                    icon: 'fas fa-eye-slash',
                    inputs: ['flow', 'visible'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `this.gameObject.visible = ${ctx.getInputValue(node, 'visible')};`
                }
            ],
            
            'Drawing': [
                {
                    type: 'fillRect',
                    label: 'Fill Rect',
                    color: '#5c0a28',
                    icon: 'fas fa-square',
                    inputs: ['flow', 'ctx', 'x', 'y', 'w', 'h', 'color'],
                    outputs: [],
                    codeGen: (node, ctx) => `ctx.fillStyle = ${ctx.getInputValue(node, 'color')};\n${ctx.indent}ctx.fillRect(${ctx.getInputValue(node, 'x')}, ${ctx.getInputValue(node, 'y')}, ${ctx.getInputValue(node, 'w')}, ${ctx.getInputValue(node, 'h')});`
                },
                {
                    type: 'strokeRect',
                    label: 'Stroke Rect',
                    color: '#63162f',
                    icon: 'fas fa-square-full',
                    inputs: ['flow', 'ctx', 'x', 'y', 'w', 'h', 'color'],
                    outputs: [],
                    codeGen: (node, ctx) => `ctx.strokeStyle = ${ctx.getInputValue(node, 'color')};\n${ctx.indent}ctx.strokeRect(${ctx.getInputValue(node, 'x')}, ${ctx.getInputValue(node, 'y')}, ${ctx.getInputValue(node, 'w')}, ${ctx.getInputValue(node, 'h')});`
                },
                {
                    type: 'fillCircle',
                    label: 'Fill Circle',
                    color: '#6a2236',
                    icon: 'fas fa-circle',
                    inputs: ['flow', 'ctx', 'x', 'y', 'radius', 'color'],
                    outputs: [],
                    codeGen: (node, ctx) => `ctx.fillStyle = ${ctx.getInputValue(node, 'color')};\n${ctx.indent}ctx.beginPath();\n${ctx.indent}ctx.arc(${ctx.getInputValue(node, 'x')}, ${ctx.getInputValue(node, 'y')}, ${ctx.getInputValue(node, 'radius')}, 0, Math.PI * 2);\n${ctx.indent}ctx.fill();`
                },
                {
                    type: 'drawText',
                    label: 'Draw Text',
                    color: '#712e3d',
                    icon: 'fas fa-font',
                    inputs: ['flow', 'ctx', 'text', 'x', 'y', 'color'],
                    outputs: [],
                    codeGen: (node, ctx) => `ctx.fillStyle = ${ctx.getInputValue(node, 'color')};\n${ctx.indent}ctx.fillText(${ctx.getInputValue(node, 'text')}, ${ctx.getInputValue(node, 'x')}, ${ctx.getInputValue(node, 'y')});`
                },
                {
                    type: 'drawLine',
                    label: 'Draw Line',
                    color: '#783a44',
                    icon: 'fas fa-slash',
                    inputs: ['flow', 'ctx', 'x1', 'y1', 'x2', 'y2', 'color'],
                    outputs: [],
                    codeGen: (node, ctx) => `ctx.strokeStyle = ${ctx.getInputValue(node, 'color')};\n${ctx.indent}ctx.beginPath();\n${ctx.indent}ctx.moveTo(${ctx.getInputValue(node, 'x1')}, ${ctx.getInputValue(node, 'y1')});\n${ctx.indent}ctx.lineTo(${ctx.getInputValue(node, 'x2')}, ${ctx.getInputValue(node, 'y2')});\n${ctx.indent}ctx.stroke();`
                },
                {
                    type: 'setLineWidth',
                    label: 'Set Line Width',
                    color: '#520824',
                    icon: 'fas fa-ruler-horizontal',
                    inputs: ['flow', 'ctx', 'width'],
                    outputs: [],
                    codeGen: (node, ctx) => `ctx.lineWidth = ${ctx.getInputValue(node, 'width')};`
                }
            ],
            'Debug': [
                {
                    type: 'log',
                    label: 'Console Log',
                    color: '#607D8B',
                    icon: 'fas fa-terminal',
                    inputs: ['flow', 'message'],
                    inputLabels: ['', 'message'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    outputLabels: [''],
                    codeGen: (node, ctx) => `console.log(${ctx.getInputValue(node, 'message')});`
                },
                {
                    type: 'warn',
                    label: 'Console Warn',
                    color: '#FFC107',
                    icon: 'fas fa-exclamation-triangle',
                    inputs: ['flow', 'message'],
                    inputLabels: ['', 'message'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    outputLabels: [''],
                    codeGen: (node, ctx) => `console.warn(${ctx.getInputValue(node, 'message')});`
                },
                {
                    type: 'error',
                    label: 'Console Error',
                    color: '#F44336',
                    icon: 'fas fa-bug',
                    inputs: ['flow', 'message'],
                    inputLabels: ['', 'message'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    outputLabels: [''],
                    codeGen: (node, ctx) => `console.error(${ctx.getInputValue(node, 'message')});`
                }
            ],
            'Input': [
                // Key Selector Node
                {
                    type: 'keySelector',
                    label: 'Key',
                    color: '#0d1f2b',
                    icon: 'fas fa-keyboard',
                    inputs: [],
                    outputs: ['value'],
                    hasDropdown: true,
                    dropdownOptions: Object.keys(InputManager.key),
                    defaultValue: 'a',
                    codeGen: (node, ctx) => {
                        const key = node.dropdownValue || 'a';
                        return `window.input.key.${key}`;
                    }
                },
                // Mouse Button Selector Node
                {
                    type: 'mouseButtonSelector',
                    label: 'Mouse Button',
                    color: '#11242f',
                    icon: 'fas fa-computer-mouse',
                    inputs: [],
                    outputs: ['value'],
                    hasDropdown: true,
                    dropdownOptions: ['left', 'middle', 'right'],
                    defaultValue: 'left',
                    codeGen: (node, ctx) => {
                        const button = node.dropdownValue || 'left';
                        return `'${button}'`;
                    }
                },
                // Keyboard Input Nodes
                {
                    type: 'keyDown',
                    label: 'Key Down',
                    color: '#1a3847',
                    icon: 'fas fa-keyboard',
                    inputs: ['flow', 'key'],
                    outputs: ['flow', 'result'],
                    codeGen: (node, ctx) => `window.input.keyDown(${ctx.getInputValue(node, 'key')})`
                },
                {
                    type: 'keyPressed',
                    label: 'Key Pressed',
                    color: '#1e4152',
                    icon: 'fas fa-keyboard',
                    inputs: ['flow', 'key'],
                    outputs: ['flow', 'result'],
                    codeGen: (node, ctx) => `window.input.keyPressed(${ctx.getInputValue(node, 'key')})`
                },
                {
                    type: 'keyReleased',
                    label: 'Key Released',
                    color: '#22495d',
                    icon: 'fas fa-keyboard',
                    inputs: ['flow', 'key'],
                    outputs: ['flow', 'result'],
                    codeGen: (node, ctx) => `window.input.keyReleased(${ctx.getInputValue(node, 'key')})`
                },
                // Mouse Input Nodes
                {
                    type: 'mouseDown',
                    label: 'Mouse Down',
                    color: '#265268',
                    icon: 'fas fa-computer-mouse',
                    inputs: ['flow', 'button'],
                    outputs: ['flow', 'result'],
                    codeGen: (node, ctx) => `window.input.mouseDown(${ctx.getInputValue(node, 'button')})`
                },
                {
                    type: 'mousePressed',
                    label: 'Mouse Pressed',
                    color: '#2a5a73',
                    icon: 'fas fa-computer-mouse',
                    inputs: ['flow', 'button'],
                    outputs: ['flow', 'result'],
                    codeGen: (node, ctx) => `window.input.mousePressed(${ctx.getInputValue(node, 'button')})`
                },
                {
                    type: 'mouseReleased',
                    label: 'Mouse Released',
                    color: '#2e637e',
                    icon: 'fas fa-computer-mouse',
                    inputs: ['flow', 'button'],
                    outputs: ['flow', 'result'],
                    codeGen: (node, ctx) => `window.input.mouseReleased(${ctx.getInputValue(node, 'button')})`
                },
                {
                    type: 'getMousePosition',
                    label: 'Get Mouse Position',
                    color: '#326b89',
                    icon: 'fas fa-location-crosshairs',
                    inputs: ['worldSpace'],
                    outputs: ['x', 'y'],
                    codeGen: (node, ctx) => {
                        const worldSpace = ctx.getInputValue(node, 'worldSpace') || 'false';
                        return `window.input.getMousePosition(${worldSpace})`;
                    }
                },
                {
                    type: 'getMouseX',
                    label: 'Get Mouse X',
                    color: '#367494',
                    icon: 'fas fa-left-right',
                    inputs: ['worldSpace'],
                    outputs: ['value'],
                    codeGen: (node, ctx) => {
                        const worldSpace = ctx.getInputValue(node, 'worldSpace') || 'false';
                        return `window.input.getMousePosition(${worldSpace}).x`;
                    }
                },
                {
                    type: 'getMouseY',
                    label: 'Get Mouse Y',
                    color: '#3a7c9f',
                    icon: 'fas fa-up-down',
                    inputs: ['worldSpace'],
                    outputs: ['value'],
                    codeGen: (node, ctx) => {
                        const worldSpace = ctx.getInputValue(node, 'worldSpace') || 'false';
                        return `window.input.getMousePosition(${worldSpace}).y`;
                    }
                },
                {
                    type: 'didMouseMove',
                    label: 'Did Mouse Move',
                    color: '#3e85aa',
                    icon: 'fas fa-arrows',
                    inputs: [],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `window.input.didMouseMove()`
                },
                {
                    type: 'getMouseWheelDelta',
                    label: 'Get Mouse Wheel',
                    color: '#428db5',
                    icon: 'fas fa-circle-dot',
                    inputs: [],
                    outputs: ['value'],
                    codeGen: (node, ctx) => `window.input.getMouseWheelDelta()`
                },
                // Touch Input Nodes
                {
                    type: 'getTouchCount',
                    label: 'Get Touch Count',
                    color: '#1b2f3d',
                    icon: 'fas fa-hand-pointer',
                    inputs: [],
                    outputs: ['value'],
                    codeGen: (node, ctx) => `window.input.getTouchCount()`
                },
                {
                    type: 'isTapped',
                    label: 'Is Tapped',
                    color: '#1f3847',
                    icon: 'fas fa-hand-point-up',
                    inputs: [],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `window.input.isTapped()`
                },
                {
                    type: 'isLongPressed',
                    label: 'Is Long Pressed',
                    color: '#234051',
                    icon: 'fas fa-hand-back-fist',
                    inputs: [],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `window.input.isLongPressed()`
                },
                {
                    type: 'isPinching',
                    label: 'Is Pinching',
                    color: '#27495b',
                    icon: 'fas fa-hands',
                    inputs: [],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `window.input.isPinching()`
                },
                {
                    type: 'getPinchScale',
                    label: 'Get Pinch Scale',
                    color: '#2b5165',
                    icon: 'fas fa-expand',
                    inputs: [],
                    outputs: ['value'],
                    codeGen: (node, ctx) => `(window.input.getPinchData()?.scale || 1)`
                },
                {
                    type: 'getSwipeDirection',
                    label: 'Get Swipe Direction',
                    color: '#2f5a6f',
                    icon: 'fas fa-hand-pointer',
                    inputs: [],
                    outputs: ['direction'],
                    codeGen: (node, ctx) => `window.input.getSwipeDirection()`
                },
                // Input State Control
                {
                    type: 'enableInput',
                    label: 'Enable Input',
                    color: '#14232e',
                    icon: 'fas fa-toggle-on',
                    inputs: ['flow'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `window.input.enable();`
                },
                {
                    type: 'disableInput',
                    label: 'Disable Input',
                    color: '#182a38',
                    icon: 'fas fa-toggle-off',
                    inputs: ['flow'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `window.input.disable();`
                }
            ],
            'Organization': [
                {
                    type: 'group',
                    label: 'Group',
                    color: '#263238',
                    icon: 'fas fa-layer-group',
                    inputs: ['flow'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    isGroup: true,
                    codeGen: (node, ctx) => ctx.generateGroupCode(node)
                },
                {
                    type: 'comment',
                    label: 'Comment',
                    color: '#333d42',
                    icon: 'fas fa-comment',
                    inputs: ['flow'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    hasInput: true,
                    codeGen: (node, ctx) => `// ${node.value || 'Comment'}`
                }
            ]
        };
    }
}

// Register globally
window.VMBExampleModules = VMBExampleModules;
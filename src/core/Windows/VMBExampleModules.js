/**
 * VMBExampleModules - Predefined example modules for Visual Module Builder
 * These modules demonstrate various features and provide starting templates
 * 
 * NOW USES PUBLIC API METHODS FOR PROPER COLOR AND NODE CREATION
 *
 * DO NOT connect setProperty to Start method to initialize. setProperty declares automatically. Use setProperty to set initial value or to change later.
 * Draw method automatically draws at game object position
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
            'keyboard-movement': this.createKeyboardMovement(),
            'mouse-follower': this.createMouseFollower(),
            'boundary-bounce': this.createBoundaryBounce(),
            'health-system': this.createHealthSystem(),
            'timer-countdown': this.createTimerCountdown(),
            'oscillating-motion': this.createOscillatingMotion(),
            //'melodicode-audio': this.createMelodiCodeAudio(),
            'empty': this.createEmpty()
        };
    }

    static getExampleNames() {
        return [
            { value: '', label: 'Select an example...' },
            { value: 'empty', label: 'Empty Module' },
            { value: 'rectangle-drawer', label: 'Rectangle Drawer' },
            { value: 'basic-physics', label: 'Basic Physics' },
            { value: 'rotating-sprite', label: 'Rotating Sprite' },
            { value: 'click-counter', label: 'Click Counter' },
            { value: 'color-cycler', label: 'Color Cycler' },
            { value: 'keyboard-movement', label: 'Keyboard Movement (WASD)' },
            { value: 'mouse-follower', label: 'Mouse Follower' },
            { value: 'boundary-bounce', label: 'Boundary Bounce' },
            { value: 'health-system', label: 'Health System' },
            { value: 'timer-countdown', label: 'Timer Countdown' },
            { value: 'oscillating-motion', label: 'Oscillating Motion' },
            //{ value: 'melodicode-audio', label: 'MelodiCode Audio Example' },
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
     * Keyboard Movement - WASD controls for moving objects
     */
    static createKeyboardMovement() {
        const builder = this.getNodeBuilder();
        const nodes = [];
        const connections = [];

        // Initialize speed property
        const speedNameNode = builder.createNode('string', 100, 100, { value: 'moveSpeed' });
        const speedValueNode = builder.createNode('number', 100, 250, { value: '5' });
        const speedPropNode = builder.createNode('setProperty', 350, 150, {
            exposeProperty: true,
            groupName: 'Movement'
        });

        // Loop event
        const loopNode = builder.createNode('loop', 100, 450, {});

        // Get current position
        const getPosNode = builder.createNode('getPosition', 350, 500, {});

        // Get speed property
        const getSpeedNameNode = builder.createNode('string', 600, 450, { value: 'moveSpeed' });
        const getSpeedNode = builder.createNode('getProperty', 850, 450, {});

        // === W Key (Up) ===
        const wKeyNode = builder.createNode('keySelector', 1100, 650, { dropdownValue: 'w' });
        const wCheckNode = builder.createNode('keyDown', 1350, 700, {});
        const wIfNode = builder.createNode('if', 1600, 700, {});

        // Subtract speed from Y
        const wSubtractNode = builder.createNode('subtract', 1850, 750, {});
        const wSetPosNode = builder.createNode('setPosition', 2100, 700, {});

        // === S Key (Down) ===
        const sKeyNode = builder.createNode('keySelector', 1100, 1000, { dropdownValue: 's' });
        const sCheckNode = builder.createNode('keyDown', 1350, 1050, {});
        const sIfNode = builder.createNode('if', 1600, 1050, {});

        // Add speed to Y
        const sAddNode = builder.createNode('add', 1850, 1100, {});
        const sSetPosNode = builder.createNode('setPosition', 2100, 1050, {});

        // === A Key (Left) ===
        const aKeyNode = builder.createNode('keySelector', 1100, 1350, { dropdownValue: 'a' });
        const aCheckNode = builder.createNode('keyDown', 1350, 1400, {});
        const aIfNode = builder.createNode('if', 1600, 1400, {});

        // Subtract speed from X
        const aSubtractNode = builder.createNode('subtract', 1850, 1450, {});
        const aSetPosNode = builder.createNode('setPosition', 2100, 1400, {});

        // === D Key (Right) ===
        const dKeyNode = builder.createNode('keySelector', 1100, 1700, { dropdownValue: 'd' });
        const dCheckNode = builder.createNode('keyDown', 1350, 1750, {});
        const dIfNode = builder.createNode('if', 1600, 1750, {});

        // Add speed to X
        const dAddNode = builder.createNode('add', 1850, 1800, {});
        const dSetPosNode = builder.createNode('setPosition', 2100, 1750, {});

        nodes.push(
            speedNameNode, speedValueNode, speedPropNode,
            loopNode, getPosNode, getSpeedNameNode, getSpeedNode,
            wKeyNode, wCheckNode, wIfNode, wSubtractNode, wSetPosNode,
            sKeyNode, sCheckNode, sIfNode, sAddNode, sSetPosNode,
            aKeyNode, aCheckNode, aIfNode, aSubtractNode, aSetPosNode,
            dKeyNode, dCheckNode, dIfNode, dAddNode, dSetPosNode
        );

        // Property initialization
        connections.push(
            { from: speedNameNode.id, fromPort: 0, to: speedPropNode.id, toPort: 1 },
            { from: speedValueNode.id, fromPort: 0, to: speedPropNode.id, toPort: 2 }
        );

        // Loop flow chain: W -> S -> A -> D
        connections.push(
            { from: loopNode.id, fromPort: 0, to: wCheckNode.id, toPort: 0 },
            { from: wCheckNode.id, fromPort: 0, to: sCheckNode.id, toPort: 0 },
            { from: sCheckNode.id, fromPort: 0, to: aCheckNode.id, toPort: 0 },
            { from: aCheckNode.id, fromPort: 0, to: dCheckNode.id, toPort: 0 }
        );

        // W key logic
        connections.push(
            { from: wKeyNode.id, fromPort: 0, to: wCheckNode.id, toPort: 1 },
            { from: wCheckNode.id, fromPort: 1, to: wIfNode.id, toPort: 1 },
            { from: wIfNode.id, fromPort: 0, to: wSetPosNode.id, toPort: 0 },
            { from: getPosNode.id, fromPort: 0, to: wSetPosNode.id, toPort: 1 },
            { from: getPosNode.id, fromPort: 1, to: wSubtractNode.id, toPort: 0 },
            { from: getSpeedNode.id, fromPort: 0, to: wSubtractNode.id, toPort: 1 },
            { from: wSubtractNode.id, fromPort: 0, to: wSetPosNode.id, toPort: 2 }
        );

        // S key logic
        connections.push(
            { from: sKeyNode.id, fromPort: 0, to: sCheckNode.id, toPort: 1 },
            { from: sCheckNode.id, fromPort: 1, to: sIfNode.id, toPort: 1 },
            { from: sIfNode.id, fromPort: 0, to: sSetPosNode.id, toPort: 0 },
            { from: getPosNode.id, fromPort: 0, to: sSetPosNode.id, toPort: 1 },
            { from: getPosNode.id, fromPort: 1, to: sAddNode.id, toPort: 0 },
            { from: getSpeedNode.id, fromPort: 0, to: sAddNode.id, toPort: 1 },
            { from: sAddNode.id, fromPort: 0, to: sSetPosNode.id, toPort: 2 }
        );

        // A key logic
        connections.push(
            { from: aKeyNode.id, fromPort: 0, to: aCheckNode.id, toPort: 1 },
            { from: aCheckNode.id, fromPort: 1, to: aIfNode.id, toPort: 1 },
            { from: aIfNode.id, fromPort: 0, to: aSetPosNode.id, toPort: 0 },
            { from: getPosNode.id, fromPort: 0, to: aSubtractNode.id, toPort: 0 },
            { from: getSpeedNode.id, fromPort: 0, to: aSubtractNode.id, toPort: 1 },
            { from: aSubtractNode.id, fromPort: 0, to: aSetPosNode.id, toPort: 1 },
            { from: getPosNode.id, fromPort: 1, to: aSetPosNode.id, toPort: 2 }
        );

        // D key logic
        connections.push(
            { from: dKeyNode.id, fromPort: 0, to: dCheckNode.id, toPort: 1 },
            { from: dCheckNode.id, fromPort: 1, to: dIfNode.id, toPort: 1 },
            { from: dIfNode.id, fromPort: 0, to: dSetPosNode.id, toPort: 0 },
            { from: getPosNode.id, fromPort: 0, to: dAddNode.id, toPort: 0 },
            { from: getSpeedNode.id, fromPort: 0, to: dAddNode.id, toPort: 1 },
            { from: dAddNode.id, fromPort: 0, to: dSetPosNode.id, toPort: 1 },
            { from: getPosNode.id, fromPort: 1, to: dSetPosNode.id, toPort: 2 }
        );

        // Connect speed property name
        connections.push(
            { from: getSpeedNameNode.id, fromPort: 0, to: getSpeedNode.id, toPort: 0 }
        );

        return {
            moduleName: 'KeyboardMovement',
            moduleNamespace: 'Input',
            moduleDescription: 'WASD keyboard controls for moving the game object',
            moduleIcon: 'fas fa-keyboard',
            moduleColor: '#1a3847',
            allowMultiple: true,
            drawInEditor: false,
            nodes: nodes,
            connections: connections
        };
    }

    /**
     * Mouse Follower - Makes object follow mouse cursor
     */
    static createMouseFollower() {
        const builder = this.getNodeBuilder();
        const nodes = [];
        const connections = [];

        // Initialize follow speed property
        const speedNameNode = builder.createNode('string', 100, 100, { value: 'followSpeed' });
        const speedValueNode = builder.createNode('number', 100, 250, { value: '0.1' });
        const speedPropNode = builder.createNode('setProperty', 350, 150, {
            exposeProperty: true,
            groupName: 'Movement'
        });

        // Loop event
        const loopNode = builder.createNode('loop', 100, 450, {});

        // Get current position
        const getPosNode = builder.createNode('getPosition', 350, 500, {});

        // Get mouse position (world space)
        const trueNode = builder.createNode('boolean', 600, 500, { value: true });
        const getMouseNode = builder.createNode('getMousePosition', 850, 500, {});

        // Calculate X difference
        const subtractXNode = builder.createNode('subtract', 1100, 550, {});

        // Calculate Y difference
        const subtractYNode = builder.createNode('subtract', 1100, 750, {});

        // Get follow speed
        const getSpeedNameNode = builder.createNode('string', 1350, 500, { value: 'followSpeed' });
        const getSpeedNode = builder.createNode('getProperty', 1600, 500, {});

        // Multiply X difference by speed
        const multXNode = builder.createNode('multiply', 1850, 550, {});

        // Multiply Y difference by speed
        const multYNode = builder.createNode('multiply', 1850, 750, {});

        // Add to current position X
        const addXNode = builder.createNode('add', 2100, 550, {});

        // Add to current position Y
        const addYNode = builder.createNode('add', 2100, 750, {});

        // Set new position
        const setPosNode = builder.createNode('setPosition', 2350, 650, {});

        nodes.push(
            speedNameNode, speedValueNode, speedPropNode,
            loopNode, getPosNode, trueNode, getMouseNode,
            subtractXNode, subtractYNode,
            getSpeedNameNode, getSpeedNode,
            multXNode, multYNode,
            addXNode, addYNode,
            setPosNode
        );

        // Property initialization
        connections.push(
            { from: speedNameNode.id, fromPort: 0, to: speedPropNode.id, toPort: 1 },
            { from: speedValueNode.id, fromPort: 0, to: speedPropNode.id, toPort: 2 }
        );

        // Loop flow
        connections.push(
            { from: loopNode.id, fromPort: 0, to: setPosNode.id, toPort: 0 }
        );

        // Get mouse position
        connections.push(
            { from: trueNode.id, fromPort: 0, to: getMouseNode.id, toPort: 0 }
        );

        // Calculate differences
        connections.push(
            { from: getMouseNode.id, fromPort: 0, to: subtractXNode.id, toPort: 0 },
            { from: getPosNode.id, fromPort: 0, to: subtractXNode.id, toPort: 1 },
            { from: getMouseNode.id, fromPort: 1, to: subtractYNode.id, toPort: 0 },
            { from: getPosNode.id, fromPort: 1, to: subtractYNode.id, toPort: 1 }
        );

        // Get speed property
        connections.push(
            { from: getSpeedNameNode.id, fromPort: 0, to: getSpeedNode.id, toPort: 0 }
        );

        // Apply speed
        connections.push(
            { from: subtractXNode.id, fromPort: 0, to: multXNode.id, toPort: 0 },
            { from: getSpeedNode.id, fromPort: 0, to: multXNode.id, toPort: 1 },
            { from: subtractYNode.id, fromPort: 0, to: multYNode.id, toPort: 0 },
            { from: getSpeedNode.id, fromPort: 0, to: multYNode.id, toPort: 1 }
        );

        // Add to current position
        connections.push(
            { from: getPosNode.id, fromPort: 0, to: addXNode.id, toPort: 0 },
            { from: multXNode.id, fromPort: 0, to: addXNode.id, toPort: 1 },
            { from: getPosNode.id, fromPort: 1, to: addYNode.id, toPort: 0 },
            { from: multYNode.id, fromPort: 0, to: addYNode.id, toPort: 1 }
        );

        // Set position
        connections.push(
            { from: addXNode.id, fromPort: 0, to: setPosNode.id, toPort: 1 },
            { from: addYNode.id, fromPort: 0, to: setPosNode.id, toPort: 2 }
        );

        return {
            moduleName: 'MouseFollower',
            moduleNamespace: 'Input',
            moduleDescription: 'Makes the game object smoothly follow the mouse cursor',
            moduleIcon: 'fas fa-computer-mouse',
            moduleColor: '#326b89',
            allowMultiple: true,
            drawInEditor: false,
            nodes: nodes,
            connections: connections
        };
    }

    /**
     * Boundary Bounce - Bounces off screen edges
     */
    static createBoundaryBounce() {
        const builder = this.getNodeBuilder();
        const nodes = [];
        const connections = [];

        // Initialize velocity properties
        const vxNameNode = builder.createNode('string', 100, 100, { value: 'velocityX' });
        const vxValueNode = builder.createNode('number', 100, 250, { value: '3' });
        const vxPropNode = builder.createNode('setProperty', 350, 150, {
            exposeProperty: true,
            groupName: 'Physics'
        });

        const vyNameNode = builder.createNode('string', 600, 100, { value: 'velocityY' });
        const vyValueNode = builder.createNode('number', 600, 250, { value: '2' });
        const vyPropNode = builder.createNode('setProperty', 850, 150, {
            exposeProperty: true,
            groupName: 'Physics'
        });

        // Loop event
        const loopNode = builder.createNode('loop', 100, 450, {});

        // Get current position
        const getPosNode = builder.createNode('getPosition', 350, 500, {});

        // Get velocities
        const getVxNameNode = builder.createNode('string', 600, 550, { value: 'velocityX' });
        const getVxNode = builder.createNode('getProperty', 850, 550, {});
        const getVyNameNode = builder.createNode('string', 600, 700, { value: 'velocityY' });
        const getVyNode = builder.createNode('getProperty', 850, 700, {});

        // Add velocity to position
        const addXNode = builder.createNode('add', 1100, 550, {});
        const addYNode = builder.createNode('add', 1100, 700, {});

        // Set new position
        const setPosNode = builder.createNode('setPosition', 1350, 600, {});

        // Check left boundary (X < 0)
        const zeroNode1 = builder.createNode('number', 1600, 900, { value: '0' });
        const checkLeftNode = builder.createNode('lessThan', 1850, 950, {});
        const ifLeftNode = builder.createNode('if', 2100, 950, {});
        const negateVxNode1 = builder.createNode('multiply', 2350, 950, {});
        const negOneNode1 = builder.createNode('number', 2350, 800, { value: '-1' });
        const setVxNameNode1 = builder.createNode('string', 2600, 900, { value: 'velocityX' });
        const setVxNode1 = builder.createNode('setProperty', 2850, 950, {});

        // Check right boundary (X > canvas width)
        const canvasWidthNode = builder.createNode('number', 1600, 1250, { value: '800' });
        const checkRightNode = builder.createNode('greaterThan', 1850, 1300, {});
        const ifRightNode = builder.createNode('if', 2100, 1300, {});
        const negateVxNode2 = builder.createNode('multiply', 2350, 1300, {});
        const negOneNode2 = builder.createNode('number', 2350, 1150, { value: '-1' });
        const setVxNameNode2 = builder.createNode('string', 2600, 1250, { value: 'velocityX' });
        const setVxNode2 = builder.createNode('setProperty', 2850, 1300, {});

        // Check top boundary (Y < 0)
        const zeroNode2 = builder.createNode('number', 1600, 1600, { value: '0' });
        const checkTopNode = builder.createNode('lessThan', 1850, 1650, {});
        const ifTopNode = builder.createNode('if', 2100, 1650, {});
        const negateVyNode1 = builder.createNode('multiply', 2350, 1650, {});
        const negOneNode3 = builder.createNode('number', 2350, 1500, { value: '-1' });
        const setVyNameNode1 = builder.createNode('string', 2600, 1600, { value: 'velocityY' });
        const setVyNode1 = builder.createNode('setProperty', 2850, 1650, {});

        // Check bottom boundary (Y > canvas height)
        const canvasHeightNode = builder.createNode('number', 1600, 1950, { value: '600' });
        const checkBottomNode = builder.createNode('greaterThan', 1850, 2000, {});
        const ifBottomNode = builder.createNode('if', 2100, 2000, {});
        const negateVyNode2 = builder.createNode('multiply', 2350, 2000, {});
        const negOneNode4 = builder.createNode('number', 2350, 1850, { value: '-1' });
        const setVyNameNode2 = builder.createNode('string', 2600, 1950, { value: 'velocityY' });
        const setVyNode2 = builder.createNode('setProperty', 2850, 2000, {});

        nodes.push(
            vxNameNode, vxValueNode, vxPropNode,
            vyNameNode, vyValueNode, vyPropNode,
            loopNode, getPosNode,
            getVxNameNode, getVxNode, getVyNameNode, getVyNode,
            addXNode, addYNode, setPosNode,
            zeroNode1, checkLeftNode, ifLeftNode, negateVxNode1, negOneNode1, setVxNameNode1, setVxNode1,
            canvasWidthNode, checkRightNode, ifRightNode, negateVxNode2, negOneNode2, setVxNameNode2, setVxNode2,
            zeroNode2, checkTopNode, ifTopNode, negateVyNode1, negOneNode3, setVyNameNode1, setVyNode1,
            canvasHeightNode, checkBottomNode, ifBottomNode, negateVyNode2, negOneNode4, setVyNameNode2, setVyNode2
        );

        // Property initialization
        connections.push(
            { from: vxNameNode.id, fromPort: 0, to: vxPropNode.id, toPort: 1 },
            { from: vxValueNode.id, fromPort: 0, to: vxPropNode.id, toPort: 2 },
            { from: vxPropNode.id, fromPort: 0, to: vyPropNode.id, toPort: 0 },
            { from: vyNameNode.id, fromPort: 0, to: vyPropNode.id, toPort: 1 },
            { from: vyValueNode.id, fromPort: 0, to: vyPropNode.id, toPort: 2 }
        );

        // Main loop flow
        connections.push(
            { from: loopNode.id, fromPort: 0, to: setPosNode.id, toPort: 0 },
            { from: setPosNode.id, fromPort: 0, to: ifLeftNode.id, toPort: 0 },
            { from: ifLeftNode.id, fromPort: 1, to: ifRightNode.id, toPort: 0 },
            { from: ifRightNode.id, fromPort: 1, to: ifTopNode.id, toPort: 0 },
            { from: ifTopNode.id, fromPort: 1, to: ifBottomNode.id, toPort: 0 }
        );

        // Get velocities and update position
        connections.push(
            { from: getVxNameNode.id, fromPort: 0, to: getVxNode.id, toPort: 0 },
            { from: getVyNameNode.id, fromPort: 0, to: getVyNode.id, toPort: 0 },
            { from: getPosNode.id, fromPort: 0, to: addXNode.id, toPort: 0 },
            { from: getVxNode.id, fromPort: 0, to: addXNode.id, toPort: 1 },
            { from: getPosNode.id, fromPort: 1, to: addYNode.id, toPort: 0 },
            { from: getVyNode.id, fromPort: 0, to: addYNode.id, toPort: 1 },
            { from: addXNode.id, fromPort: 0, to: setPosNode.id, toPort: 1 },
            { from: addYNode.id, fromPort: 0, to: setPosNode.id, toPort: 2 }
        );

        // Left boundary check
        connections.push(
            { from: addXNode.id, fromPort: 0, to: checkLeftNode.id, toPort: 0 },
            { from: zeroNode1.id, fromPort: 0, to: checkLeftNode.id, toPort: 1 },
            { from: checkLeftNode.id, fromPort: 0, to: ifLeftNode.id, toPort: 1 },
            { from: ifLeftNode.id, fromPort: 0, to: setVxNode1.id, toPort: 0 },
            { from: getVxNode.id, fromPort: 0, to: negateVxNode1.id, toPort: 0 },
            { from: negOneNode1.id, fromPort: 0, to: negateVxNode1.id, toPort: 1 },
            { from: setVxNameNode1.id, fromPort: 0, to: setVxNode1.id, toPort: 1 },
            { from: negateVxNode1.id, fromPort: 0, to: setVxNode1.id, toPort: 2 }
        );

        // Right boundary check
        connections.push(
            { from: addXNode.id, fromPort: 0, to: checkRightNode.id, toPort: 0 },
            { from: canvasWidthNode.id, fromPort: 0, to: checkRightNode.id, toPort: 1 },
            { from: checkRightNode.id, fromPort: 0, to: ifRightNode.id, toPort: 1 },
            { from: ifRightNode.id, fromPort: 0, to: setVxNode2.id, toPort: 0 },
            { from: getVxNode.id, fromPort: 0, to: negateVxNode2.id, toPort: 0 },
            { from: negOneNode2.id, fromPort: 0, to: negateVxNode2.id, toPort: 1 },
            { from: setVxNameNode2.id, fromPort: 0, to: setVxNode2.id, toPort: 1 },
            { from: negateVxNode2.id, fromPort: 0, to: setVxNode2.id, toPort: 2 }
        );

        // Top boundary check
        connections.push(
            { from: addYNode.id, fromPort: 0, to: checkTopNode.id, toPort: 0 },
            { from: zeroNode2.id, fromPort: 0, to: checkTopNode.id, toPort: 1 },
            { from: checkTopNode.id, fromPort: 0, to: ifTopNode.id, toPort: 1 },
            { from: ifTopNode.id, fromPort: 0, to: setVyNode1.id, toPort: 0 },
            { from: getVyNode.id, fromPort: 0, to: negateVyNode1.id, toPort: 0 },
            { from: negOneNode3.id, fromPort: 0, to: negateVyNode1.id, toPort: 1 },
            { from: setVyNameNode1.id, fromPort: 0, to: setVyNode1.id, toPort: 1 },
            { from: negateVyNode1.id, fromPort: 0, to: setVyNode1.id, toPort: 2 }
        );

        // Bottom boundary check
        connections.push(
            { from: addYNode.id, fromPort: 0, to: checkBottomNode.id, toPort: 0 },
            { from: canvasHeightNode.id, fromPort: 0, to: checkBottomNode.id, toPort: 1 },
            { from: checkBottomNode.id, fromPort: 0, to: ifBottomNode.id, toPort: 1 },
            { from: ifBottomNode.id, fromPort: 0, to: setVyNode2.id, toPort: 0 },
            { from: getVyNode.id, fromPort: 0, to: negateVyNode2.id, toPort: 0 },
            { from: negOneNode4.id, fromPort: 0, to: negateVyNode2.id, toPort: 1 },
            { from: setVyNameNode2.id, fromPort: 0, to: setVyNode2.id, toPort: 1 },
            { from: negateVyNode2.id, fromPort: 0, to: setVyNode2.id, toPort: 2 }
        );

        return {
            moduleName: 'BoundaryBounce',
            moduleNamespace: 'Physics',
            moduleDescription: 'Bounces object off screen boundaries by reversing velocity',
            moduleIcon: 'fas fa-border-all',
            moduleColor: '#522d5c',
            allowMultiple: true,
            drawInEditor: false,
            nodes: nodes,
            connections: connections
        };
    }

    /**
     * Health System - Simple health bar with damage visualization
     */
    static createHealthSystem() {
        const builder = this.getNodeBuilder();
        const nodes = [];
        const connections = [];

        // Initialize health properties
        const healthNameNode = builder.createNode('string', 100, 100, { value: 'health' });
        const healthValueNode = builder.createNode('number', 100, 250, { value: '100' });
        const healthPropNode = builder.createNode('setProperty', 350, 150, {
            exposeProperty: true,
            groupName: 'Health'
        });

        const maxHealthNameNode = builder.createNode('string', 600, 100, { value: 'maxHealth' });
        const maxHealthValueNode = builder.createNode('number', 600, 250, { value: '100' });
        const maxHealthPropNode = builder.createNode('setProperty', 850, 150, {
            exposeProperty: true,
            groupName: 'Health'
        });

        // Draw event
        const drawNode = builder.createNode('draw', 100, 450, {});

        // Background bar (red)
        const bgXNode = builder.createNode('number', 350, 500, { value: '-50' });
        const bgYNode = builder.createNode('number', 350, 650, { value: '-60' });
        const bgWidthNode = builder.createNode('number', 600, 500, { value: '100' });
        const bgHeightNode = builder.createNode('number', 600, 650, { value: '10' });
        const bgColorNode = builder.createNode('color', 850, 550, { value: '#8B0000' });
        const bgRectNode = builder.createNode('fillRect', 1100, 600, {});

        // Calculate health bar width
        const getHealthNameNode = builder.createNode('string', 350, 900, { value: 'health' });
        const getHealthNode = builder.createNode('getProperty', 600, 900, {});
        const getMaxHealthNameNode = builder.createNode('string', 350, 1050, { value: 'maxHealth' });
        const getMaxHealthNode = builder.createNode('getProperty', 600, 1050, {});

        const divideNode = builder.createNode('divide', 850, 950, {});
        const barMaxWidthNode = builder.createNode('number', 1100, 900, { value: '100' });
        const multiplyNode = builder.createNode('multiply', 1350, 950, {});

        // Foreground bar (green)
        const fgXNode = builder.createNode('number', 1600, 950, { value: '-50' });
        const fgYNode = builder.createNode('number', 1600, 1100, { value: '-60' });
        const fgHeightNode = builder.createNode('number', 1850, 1050, { value: '10' });
        const fgColorNode = builder.createNode('color', 2100, 1000, { value: '#00FF00' });
        const fgRectNode = builder.createNode('fillRect', 2350, 1050, {});

        nodes.push(
            healthNameNode, healthValueNode, healthPropNode,
            maxHealthNameNode, maxHealthValueNode, maxHealthPropNode,
            drawNode,
            bgXNode, bgYNode, bgWidthNode, bgHeightNode, bgColorNode, bgRectNode,
            getHealthNameNode, getHealthNode, getMaxHealthNameNode, getMaxHealthNode,
            divideNode, barMaxWidthNode, multiplyNode,
            fgXNode, fgYNode, fgHeightNode, fgColorNode, fgRectNode
        );

        // Property initialization
        connections.push(
            { from: healthNameNode.id, fromPort: 0, to: healthPropNode.id, toPort: 1 },
            { from: healthValueNode.id, fromPort: 0, to: healthPropNode.id, toPort: 2 },
            { from: healthPropNode.id, fromPort: 0, to: maxHealthPropNode.id, toPort: 0 },
            { from: maxHealthNameNode.id, fromPort: 0, to: maxHealthPropNode.id, toPort: 1 },
            { from: maxHealthValueNode.id, fromPort: 0, to: maxHealthPropNode.id, toPort: 2 }
        );

        // Draw background bar
        connections.push(
            { from: drawNode.id, fromPort: 0, to: bgRectNode.id, toPort: 0 },
            { from: drawNode.id, fromPort: 1, to: bgRectNode.id, toPort: 1 },
            { from: bgXNode.id, fromPort: 0, to: bgRectNode.id, toPort: 2 },
            { from: bgYNode.id, fromPort: 0, to: bgRectNode.id, toPort: 3 },
            { from: bgWidthNode.id, fromPort: 0, to: bgRectNode.id, toPort: 4 },
            { from: bgHeightNode.id, fromPort: 0, to: bgRectNode.id, toPort: 5 },
            { from: bgColorNode.id, fromPort: 0, to: bgRectNode.id, toPort: 6 }
        );

        // Calculate health percentage and bar width
        connections.push(
            { from: getHealthNameNode.id, fromPort: 0, to: getHealthNode.id, toPort: 0 },
            { from: getMaxHealthNameNode.id, fromPort: 0, to: getMaxHealthNode.id, toPort: 0 },
            { from: getHealthNode.id, fromPort: 0, to: divideNode.id, toPort: 0 },
            { from: getMaxHealthNode.id, fromPort: 0, to: divideNode.id, toPort: 1 },
            { from: divideNode.id, fromPort: 0, to: multiplyNode.id, toPort: 0 },
            { from: barMaxWidthNode.id, fromPort: 0, to: multiplyNode.id, toPort: 1 }
        );

        // Draw foreground bar (must draw after background)
        connections.push(
            { from: bgRectNode.id, fromPort: 0, to: fgRectNode.id, toPort: 0 },
            { from: drawNode.id, fromPort: 1, to: fgRectNode.id, toPort: 1 },
            { from: fgXNode.id, fromPort: 0, to: fgRectNode.id, toPort: 2 },
            { from: fgYNode.id, fromPort: 0, to: fgRectNode.id, toPort: 3 },
            { from: multiplyNode.id, fromPort: 0, to: fgRectNode.id, toPort: 4 },
            { from: fgHeightNode.id, fromPort: 0, to: fgRectNode.id, toPort: 5 },
            { from: fgColorNode.id, fromPort: 0, to: fgRectNode.id, toPort: 6 }
        );

        return {
            moduleName: 'HealthSystem',
            moduleNamespace: 'UI',
            moduleDescription: 'Visual health bar that displays current/max health ratio',
            moduleIcon: 'fas fa-heart',
            moduleColor: '#F44336',
            allowMultiple: true,
            drawInEditor: true,
            nodes: nodes,
            connections: connections
        };
    }

    /**
     * Timer Countdown - Countdown timer with visual display
     */
    static createTimerCountdown() {
        const builder = this.getNodeBuilder();
        const nodes = [];
        const connections = [];

        // Initialize timer properties
        const timeNameNode = builder.createNode('string', 100, 100, { value: 'timeRemaining' });
        const timeValueNode = builder.createNode('number', 100, 250, { value: '60' });
        const timePropNode = builder.createNode('setProperty', 350, 150, {
            exposeProperty: true,
            groupName: 'Timer'
        });

        // Loop event
        const loopNode = builder.createNode('loop', 100, 450, {});

        // Get time remaining
        const getTimeNameNode = builder.createNode('string', 350, 500, { value: 'timeRemaining' });
        const getTimeNode = builder.createNode('getProperty', 600, 500, {});

        // Check if time > 0
        const zeroNode = builder.createNode('number', 850, 450, { value: '0' });
        const checkTimeNode = builder.createNode('greaterThan', 1100, 500, {});
        const ifTimeNode = builder.createNode('if', 1350, 500, {});

        // Get delta time
        const getDeltaNode = builder.createNode('getDeltaTime', 1600, 500, {});

        // Subtract delta from time
        const subtractNode = builder.createNode('subtract', 1850, 550, {});

        // Clamp to 0
        const maxNode = builder.createNode('max', 2100, 550, {});
        const zeroNode2 = builder.createNode('number', 2100, 400, { value: '0' });

        // Set new time
        const setTimeNameNode = builder.createNode('string', 2350, 500, { value: 'timeRemaining' });
        const setTimeNode = builder.createNode('setProperty', 2600, 550, {});

        // Draw event
        const drawNode = builder.createNode('draw', 100, 900, {});

        // Get time for display
        const getTimeNameNode2 = builder.createNode('string', 350, 950, { value: 'timeRemaining' });
        const getTimeNode2 = builder.createNode('getProperty', 600, 950, {});

        // Round to integer
        const roundNode = builder.createNode('round', 850, 950, {});

        // Draw text
        const xPosNode = builder.createNode('number', 1100, 900, { value: '0' });
        const yPosNode = builder.createNode('number', 1100, 1050, { value: '-40' });
        const colorNode = builder.createNode('color', 1350, 950, { value: '#FFFF00' });
        const fontSizeNode = builder.createNode('number', 1350, 1100, { value: '24' });
        const drawTextNode = builder.createNode('drawText', 1600, 1000, {});

        nodes.push(
            timeNameNode, timeValueNode, timePropNode,
            loopNode,
            getTimeNameNode, getTimeNode,
            zeroNode, checkTimeNode, ifTimeNode,
            getDeltaNode, subtractNode,
            maxNode, zeroNode2,
            setTimeNameNode, setTimeNode,
            drawNode,
            getTimeNameNode2, getTimeNode2,
            roundNode,
            xPosNode, yPosNode, colorNode, fontSizeNode, drawTextNode
        );

        // Property initialization
        connections.push(
            { from: timeNameNode.id, fromPort: 0, to: timePropNode.id, toPort: 1 },
            { from: timeValueNode.id, fromPort: 0, to: timePropNode.id, toPort: 2 }
        );

        // Loop logic
        connections.push(
            { from: loopNode.id, fromPort: 0, to: ifTimeNode.id, toPort: 0 }
        );

        // Check if time > 0 and countdown
        connections.push(
            { from: getTimeNameNode.id, fromPort: 0, to: getTimeNode.id, toPort: 0 },
            { from: getTimeNode.id, fromPort: 0, to: checkTimeNode.id, toPort: 0 },
            { from: zeroNode.id, fromPort: 0, to: checkTimeNode.id, toPort: 1 },
            { from: checkTimeNode.id, fromPort: 0, to: ifTimeNode.id, toPort: 1 },
            { from: ifTimeNode.id, fromPort: 0, to: setTimeNode.id, toPort: 0 }
        );

        // Subtract delta time
        connections.push(
            { from: getTimeNode.id, fromPort: 0, to: subtractNode.id, toPort: 0 },
            { from: getDeltaNode.id, fromPort: 0, to: subtractNode.id, toPort: 1 }
        );

        // Clamp to 0
        connections.push(
            { from: subtractNode.id, fromPort: 0, to: maxNode.id, toPort: 0 },
            { from: zeroNode2.id, fromPort: 0, to: maxNode.id, toPort: 1 },
            { from: setTimeNameNode.id, fromPort: 0, to: setTimeNode.id, toPort: 1 },
            { from: maxNode.id, fromPort: 0, to: setTimeNode.id, toPort: 2 }
        );

        // Draw display
        connections.push(
            { from: drawNode.id, fromPort: 0, to: drawTextNode.id, toPort: 0 },
            { from: drawNode.id, fromPort: 1, to: drawTextNode.id, toPort: 1 }
        );

        // Get and format time
        connections.push(
            { from: getTimeNameNode2.id, fromPort: 0, to: getTimeNode2.id, toPort: 0 },
            { from: getTimeNode2.id, fromPort: 0, to: roundNode.id, toPort: 0 },
            { from: roundNode.id, fromPort: 0, to: drawTextNode.id, toPort: 2 },
            { from: xPosNode.id, fromPort: 0, to: drawTextNode.id, toPort: 3 },
            { from: yPosNode.id, fromPort: 0, to: drawTextNode.id, toPort: 4 },
            { from: colorNode.id, fromPort: 0, to: drawTextNode.id, toPort: 5 },
            { from: fontSizeNode.id, fromPort: 0, to: drawTextNode.id, toPort: 6 }
        );

        return {
            moduleName: 'TimerCountdown',
            moduleNamespace: 'Gameplay',
            moduleDescription: 'Countdown timer that decreases each frame and displays time remaining',
            moduleIcon: 'fas fa-stopwatch',
            moduleColor: '#FFC107',
            allowMultiple: true,
            drawInEditor: true,
            nodes: nodes,
            connections: connections
        };
    }

    /**
     * Oscillating Motion - Smooth back-and-forth motion using sine wave
     */
    static createOscillatingMotion() {
        const builder = this.getNodeBuilder();
        const nodes = [];
        const connections = [];

        // Initialize properties
        const timeNameNode = builder.createNode('string', 100, 100, { value: 'oscillationTime' });
        const timeValueNode = builder.createNode('number', 100, 250, { value: '0' });
        const timePropNode = builder.createNode('setProperty', 350, 150, {});

        const speedNameNode = builder.createNode('string', 600, 100, { value: 'oscillationSpeed' });
        const speedValueNode = builder.createNode('number', 600, 250, { value: '2' });
        const speedPropNode = builder.createNode('setProperty', 850, 150, {
            exposeProperty: true,
            groupName: 'Motion'
        });

        const amplitudeNameNode = builder.createNode('string', 1100, 100, { value: 'amplitude' });
        const amplitudeValueNode = builder.createNode('number', 1100, 250, { value: '100' });
        const amplitudePropNode = builder.createNode('setProperty', 1350, 150, {
            exposeProperty: true,
            groupName: 'Motion'
        });

        const startXNameNode = builder.createNode('string', 1600, 100, { value: 'startX' });
        const startXValueNode = builder.createNode('number', 1600, 250, { value: '400' });
        const startXPropNode = builder.createNode('setProperty', 1850, 150, {
            exposeProperty: true,
            groupName: 'Motion'
        });

        const startYNameNode = builder.createNode('string', 2100, 100, { value: 'startY' });
        const startYValueNode = builder.createNode('number', 2100, 250, { value: '300' });
        const startYPropNode = builder.createNode('setProperty', 2350, 150, {
            exposeProperty: true,
            groupName: 'Motion'
        });

        // Loop event
        const loopNode = builder.createNode('loop', 100, 450, {});

        // Get oscillation time
        const getTimeNameNode = builder.createNode('string', 350, 500, { value: 'oscillationTime' });
        const getTimeNode = builder.createNode('getProperty', 600, 500, {});

        // Get delta time
        const getDeltaNode = builder.createNode('getDeltaTime', 850, 500, {});

        // Get speed
        const getSpeedNameNode = builder.createNode('string', 1100, 450, { value: 'oscillationSpeed' });
        const getSpeedNode = builder.createNode('getProperty', 1350, 450, {});

        // Multiply delta by speed
        const multDeltaNode = builder.createNode('multiply', 1600, 500, {});

        // Add to time
        const addTimeNode = builder.createNode('add', 1850, 550, {});

        // Set new time
        const setTimeNameNode = builder.createNode('string', 2100, 500, { value: 'oscillationTime' });
        const setTimeNode = builder.createNode('setProperty', 2350, 550, {});

        // Calculate sine wave
        const sinNode = builder.createNode('sin', 2600, 550, {});

        // Get amplitude
        const getAmpNameNode = builder.createNode('string', 2850, 500, { value: 'amplitude' });
        const getAmpNode = builder.createNode('getProperty', 3100, 500, {});

        // Multiply sine by amplitude
        const multSineNode = builder.createNode('multiply', 3350, 550, {});

        // Get start position
        const getStartXNameNode = builder.createNode('string', 3600, 500, { value: 'startX' });
        const getStartXNode = builder.createNode('getProperty', 3850, 500, {});
        const getStartYNameNode = builder.createNode('string', 3600, 650, { value: 'startY' });
        const getStartYNode = builder.createNode('getProperty', 3850, 650, {});

        // Add offset to start X
        const addXNode = builder.createNode('add', 4100, 550, {});

        // Set position
        const setPosNode = builder.createNode('setPosition', 4350, 600, {});

        nodes.push(
            timeNameNode, timeValueNode, timePropNode,
            speedNameNode, speedValueNode, speedPropNode,
            amplitudeNameNode, amplitudeValueNode, amplitudePropNode,
            startXNameNode, startXValueNode, startXPropNode,
            startYNameNode, startYValueNode, startYPropNode,
            loopNode,
            getTimeNameNode, getTimeNode,
            getDeltaNode,
            getSpeedNameNode, getSpeedNode,
            multDeltaNode, addTimeNode,
            setTimeNameNode, setTimeNode,
            sinNode,
            getAmpNameNode, getAmpNode,
            multSineNode,
            getStartXNameNode, getStartXNode,
            getStartYNameNode, getStartYNode,
            addXNode,
            setPosNode
        );

        // Property initialization
        connections.push(
            { from: timeNameNode.id, fromPort: 0, to: timePropNode.id, toPort: 1 },
            { from: timeValueNode.id, fromPort: 0, to: timePropNode.id, toPort: 2 },
            { from: timePropNode.id, fromPort: 0, to: speedPropNode.id, toPort: 0 },
            { from: speedNameNode.id, fromPort: 0, to: speedPropNode.id, toPort: 1 },
            { from: speedValueNode.id, fromPort: 0, to: speedPropNode.id, toPort: 2 },
            { from: speedPropNode.id, fromPort: 0, to: amplitudePropNode.id, toPort: 0 },
            { from: amplitudeNameNode.id, fromPort: 0, to: amplitudePropNode.id, toPort: 1 },
            { from: amplitudeValueNode.id, fromPort: 0, to: amplitudePropNode.id, toPort: 2 },
            { from: amplitudePropNode.id, fromPort: 0, to: startXPropNode.id, toPort: 0 },
            { from: startXNameNode.id, fromPort: 0, to: startXPropNode.id, toPort: 1 },
            { from: startXValueNode.id, fromPort: 0, to: startXPropNode.id, toPort: 2 },
            { from: startXPropNode.id, fromPort: 0, to: startYPropNode.id, toPort: 0 },
            { from: startYNameNode.id, fromPort: 0, to: startYPropNode.id, toPort: 1 },
            { from: startYValueNode.id, fromPort: 0, to: startYPropNode.id, toPort: 2 }
        );

        // Loop flow
        connections.push(
            { from: loopNode.id, fromPort: 0, to: setTimeNode.id, toPort: 0 },
            { from: setTimeNode.id, fromPort: 0, to: setPosNode.id, toPort: 0 }
        );

        // Update time
        connections.push(
            { from: getTimeNameNode.id, fromPort: 0, to: getTimeNode.id, toPort: 0 },
            { from: getSpeedNameNode.id, fromPort: 0, to: getSpeedNode.id, toPort: 0 },
            { from: getDeltaNode.id, fromPort: 0, to: multDeltaNode.id, toPort: 0 },
            { from: getSpeedNode.id, fromPort: 0, to: multDeltaNode.id, toPort: 1 },
            { from: getTimeNode.id, fromPort: 0, to: addTimeNode.id, toPort: 0 },
            { from: multDeltaNode.id, fromPort: 0, to: addTimeNode.id, toPort: 1 },
            { from: setTimeNameNode.id, fromPort: 0, to: setTimeNode.id, toPort: 1 },
            { from: addTimeNode.id, fromPort: 0, to: setTimeNode.id, toPort: 2 }
        );

        // Calculate position
        connections.push(
            { from: addTimeNode.id, fromPort: 0, to: sinNode.id, toPort: 0 },
            { from: getAmpNameNode.id, fromPort: 0, to: getAmpNode.id, toPort: 0 },
            { from: sinNode.id, fromPort: 0, to: multSineNode.id, toPort: 0 },
            { from: getAmpNode.id, fromPort: 0, to: multSineNode.id, toPort: 1 },
            { from: getStartXNameNode.id, fromPort: 0, to: getStartXNode.id, toPort: 0 },
            { from: getStartYNameNode.id, fromPort: 0, to: getStartYNode.id, toPort: 0 },
            { from: getStartXNode.id, fromPort: 0, to: addXNode.id, toPort: 0 },
            { from: multSineNode.id, fromPort: 0, to: addXNode.id, toPort: 1 },
            { from: addXNode.id, fromPort: 0, to: setPosNode.id, toPort: 1 },
            { from: getStartYNode.id, fromPort: 0, to: setPosNode.id, toPort: 2 }
        );

        return {
            moduleName: 'OscillatingMotion',
            moduleNamespace: 'Animation',
            moduleDescription: 'Smooth back-and-forth horizontal motion using sine wave',
            moduleIcon: 'fas fa-wave-square',
            moduleColor: '#9C27B0',
            allowMultiple: true,
            drawInEditor: false,
            nodes: nodes,
            connections: connections
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
        //const startNode = builder.createNode('start', 100, 100, {});

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
            //startNode,
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
            //{ from: startNode.id, fromPort: 0, to: xPropNode.id, toPort: 0 },
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
        //const startNode = builder.createNode('start', 100, 100, {});

        // Initialize velocityY (exposed property)
        const vyNameNode = builder.createNode('string', 350, 50, { value: 'velocityY' });
        const vyValueNode = builder.createNode('number', 350, 200, { value: '0' });
        const vyPropNode = builder.createNode('setProperty', 600, 100, {
            exposeProperty: true,
            groupName: 'Physics'
        });

        // Initialize gravity (exposed property)
        const gravityNameNode = builder.createNode('string', 850, 50, { value: 'gravity' });
        const gravityValueNode = builder.createNode('number', 850, 200, { value: '0.5' });
        const gravityPropNode = builder.createNode('setProperty', 1100, 100, {
            exposeProperty: true,
            groupName: 'Physics'
        });

        // Initialize radius (exposed property) for drawing
        const radiusNameNode = builder.createNode('string', 1350, 50, { value: 'radius' });
        const radiusValueNode = builder.createNode('number', 1350, 200, { value: '20' });
        const radiusPropNode = builder.createNode('setProperty', 1600, 100, {
            exposeProperty: true,
            groupName: 'Display'
        });

        // Initialize color (exposed property)
        const colorNameNode = builder.createNode('string', 1850, 50, { value: 'ballColor' });
        const colorValueNode = builder.createNode('color', 1850, 200, { value: '#2196F3' });
        const colorPropNode = builder.createNode('setProperty', 2100, 100, {
            exposeProperty: true,
            groupName: 'Display'
        });

        // Loop event
        const loopNode = builder.createNode('loop', 100, 400, {});

        // Get current position
        const getPosNode = builder.createNode('getPosition', 350, 450, {});

        // Get velocityY property
        const getVYNameNode = builder.createNode('string', 600, 400, { value: 'velocityY' });
        const getVYNode = builder.createNode('getProperty', 850, 400, {});

        // Add velocityY to Y position
        const addYNode = builder.createNode('add', 1100, 500, {});

        // Set new position with updated Y
        const setPosNode = builder.createNode('setPosition', 1350, 450, {});

        // Apply gravity - get velocityY and gravity, add them
        const getVY2NameNode = builder.createNode('string', 350, 750, { value: 'velocityY' });
        const getGravityNameNode = builder.createNode('string', 350, 900, { value: 'gravity' });
        const getVYNode2 = builder.createNode('getProperty', 600, 750, {});
        const getGravityNode = builder.createNode('getProperty', 600, 900, {});
        const addGravityNode = builder.createNode('add', 850, 800, {});
        const setVYNameNode = builder.createNode('string', 1100, 750, { value: 'velocityY' });
        const setVYNode = builder.createNode('setProperty', 1350, 800, {});

        // Draw event
        const drawNode = builder.createNode('draw', 100, 1100, {});

        // Get radius and color properties for drawing
        const getRadiusNameNode = builder.createNode('string', 350, 1150, { value: 'radius' });
        const getColorNameNode = builder.createNode('string', 350, 1300, { value: 'ballColor' });
        const getRadiusNode = builder.createNode('getProperty', 600, 1150, {});
        const getColorNode = builder.createNode('getProperty', 600, 1300, {});

        // Draw at 0, 0 since draw event draws to game object position
        const xNode = builder.createNode('number', 850, 1150, { value: '0' });
        const yNode = builder.createNode('number', 850, 1300, { value: '0' });
        const fillCircleNode = builder.createNode('fillCircle', 1100, 1250, {});

        nodes.push(
            //startNode, 
            vyNameNode, vyValueNode, vyPropNode,
            gravityNameNode, gravityValueNode, gravityPropNode,
            radiusNameNode, radiusValueNode, radiusPropNode,
            colorNameNode, colorValueNode, colorPropNode,
            loopNode,
            getPosNode, getVYNameNode, getVYNode, addYNode, setPosNode,
            getVY2NameNode, getGravityNameNode, getVYNode2, getGravityNode, addGravityNode, setVYNameNode, setVYNode,
            drawNode,
            getRadiusNameNode, getColorNameNode, getRadiusNode, getColorNode, xNode, yNode, fillCircleNode
        );

        // Start flow connections
        connections.push(
            // { from: startNode.id, fromPort: 0, to: vyPropNode.id, toPort: 0 },
            { from: vyPropNode.id, fromPort: 0, to: gravityPropNode.id, toPort: 0 },
            { from: gravityPropNode.id, fromPort: 0, to: radiusPropNode.id, toPort: 0 },
            { from: radiusPropNode.id, fromPort: 0, to: colorPropNode.id, toPort: 0 }
        );

        // Start data connections for exposed properties
        connections.push(
            { from: vyNameNode.id, fromPort: 0, to: vyPropNode.id, toPort: 1 },
            { from: vyValueNode.id, fromPort: 0, to: vyPropNode.id, toPort: 2 },
            { from: gravityNameNode.id, fromPort: 0, to: gravityPropNode.id, toPort: 1 },
            { from: gravityValueNode.id, fromPort: 0, to: gravityPropNode.id, toPort: 2 },
            { from: radiusNameNode.id, fromPort: 0, to: radiusPropNode.id, toPort: 1 },
            { from: radiusValueNode.id, fromPort: 0, to: radiusPropNode.id, toPort: 2 },
            { from: colorNameNode.id, fromPort: 0, to: colorPropNode.id, toPort: 1 },
            { from: colorValueNode.id, fromPort: 0, to: colorPropNode.id, toPort: 2 }
        );

        // Loop flow connections
        connections.push(
            { from: loopNode.id, fromPort: 0, to: setPosNode.id, toPort: 0 },
            { from: setPosNode.id, fromPort: 0, to: setVYNode.id, toPort: 0 }
        );

        // Loop data connections - update Y position
        // getPosition outputs: ['x', 'y'], setPosition inputs: ['flow', 'x', 'y']
        connections.push(
            { from: getPosNode.id, fromPort: 0, to: setPosNode.id, toPort: 1 }, // x stays same
            { from: getPosNode.id, fromPort: 1, to: addYNode.id, toPort: 0 }, // current y to add
            { from: getVYNameNode.id, fromPort: 0, to: getVYNode.id, toPort: 0 },
            { from: getVYNode.id, fromPort: 0, to: addYNode.id, toPort: 1 }, // velocityY to add
            { from: addYNode.id, fromPort: 0, to: setPosNode.id, toPort: 2 } // new y to setPosition
        );

        // Loop data connections - apply gravity to velocity
        connections.push(
            { from: getVY2NameNode.id, fromPort: 0, to: getVYNode2.id, toPort: 0 },
            { from: getGravityNameNode.id, fromPort: 0, to: getGravityNode.id, toPort: 0 },
            { from: getVYNode2.id, fromPort: 0, to: addGravityNode.id, toPort: 0 }, // current velocity
            { from: getGravityNode.id, fromPort: 0, to: addGravityNode.id, toPort: 1 }, // gravity
            { from: setVYNameNode.id, fromPort: 0, to: setVYNode.id, toPort: 1 },
            { from: addGravityNode.id, fromPort: 0, to: setVYNode.id, toPort: 2 }
        );

        // Draw flow and data connections
        // fillCircle inputs: ['flow', 'ctx', 'x', 'y', 'radius', 'color']
        connections.push(
            { from: drawNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 0 }, // flow
            { from: drawNode.id, fromPort: 1, to: fillCircleNode.id, toPort: 1 }, // ctx
            { from: xNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 2 }, // x = 0
            { from: yNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 3 }, // y = 0
            { from: getRadiusNameNode.id, fromPort: 0, to: getRadiusNode.id, toPort: 0 },
            { from: getRadiusNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 4 }, // radius
            { from: getColorNameNode.id, fromPort: 0, to: getColorNode.id, toPort: 0 },
            { from: getColorNode.id, fromPort: 0, to: fillCircleNode.id, toPort: 5 } // color
        );

        return {
            moduleName: 'BasicPhysicsNodes',
            moduleNamespace: 'Physics',
            moduleDescription: 'A simple physics object with gravity using GameObject position',
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

        // Initialize rotation speed
        const speedNameNode = builder.createNode('string', 350, 50, { value: 'rotationSpeed' });
        const speedValueNode = builder.createNode('number', 350, 200, { value: '0.05' });
        const speedPropNode = builder.createNode('setProperty', 600, 100, {
            exposeProperty: true,
            groupName: 'Rotation'
        });

        const loopNode = builder.createNode('loop', 100, 400, {});

        // Get current angle from game object
        const getAngleNode = builder.createNode('getAngle', 350, 450, {});

        // Get rotation speed
        const getSpeedNameNode = builder.createNode('string', 350, 600, { value: 'rotationSpeed' });
        const getSpeedNode = builder.createNode('getProperty', 600, 600, {});

        // Add speed to current angle
        const addRotNode = builder.createNode('add', 850, 500, {});

        // Set new angle to game object
        const setAngleNode = builder.createNode('setAngle', 1100, 500, {});

        nodes.push(
            speedNameNode, speedValueNode, speedPropNode,
            loopNode,
            getAngleNode, getSpeedNameNode, getSpeedNode, addRotNode,
            setAngleNode
        );

        // Initialize rotation speed
        connections.push(
            { from: speedNameNode.id, fromPort: 0, to: speedPropNode.id, toPort: 1 },
            { from: speedValueNode.id, fromPort: 0, to: speedPropNode.id, toPort: 2 }
        );

        // Loop flow
        connections.push(
            { from: loopNode.id, fromPort: 0, to: setAngleNode.id, toPort: 0 }
        );

        // Loop data - get angle, add speed, set angle
        connections.push(
            { from: getAngleNode.id, fromPort: 0, to: addRotNode.id, toPort: 0 },
            { from: getSpeedNameNode.id, fromPort: 0, to: getSpeedNode.id, toPort: 0 },
            { from: getSpeedNode.id, fromPort: 0, to: addRotNode.id, toPort: 1 },
            { from: addRotNode.id, fromPort: 0, to: setAngleNode.id, toPort: 1 }
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

        //const startNode = builder.createNode('start', 100, 100, {});

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
            //startNode, 
            counterNameNode, counterValueNode, counterPropNode,
            drawNode,
            countPropNameNode, getCountNode,
            xPosNode, yPosNode, colorNode, drawTextNode
        );

        // Start flow
        //connections.push(
        //{ from: startNode.id, fromPort: 0, to: counterPropNode.id, toPort: 0 }
        //);

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

        //const startNode = builder.createNode('start', 100, 100, {});

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
            //startNode, 
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
            //{ from: startNode.id, fromPort: 0, to: huePropNode.id, toPort: 0 },
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
 * MelodiCode Audio - Example showing how to create music with MelodiCode nodes
 */
    static createMelodiCodeAudio() {
        const builder = this.getNodeBuilder();
        const nodes = [];
        const connections = [];

        // Set BPM
        const bpmValueNode = builder.createNode('number', 100, 100, { value: '120' });
        const setBPMNode = builder.createNode('melodicodeScriptBPM', 350, 100, {});

        // Start main block
        const mainBlockNameNode = builder.createNode('string', 600, 100, { value: 'main' });
        const startMainBlockNode = builder.createNode('melodicodeScriptBlockStart', 850, 100, {});

        // Create a melody section
        // Note 1: C4
        const note1Node = builder.createNode('melodicodeNoteSelector', 1100, 150, { dropdownValue: 'C4' });
        const duration1Node = builder.createNode('number', 1100, 300, { value: '0.5' });
        const addTone1Node = builder.createNode('melodicodeScriptTone', 1350, 200, { dropdownValue: 'sine' });

        // Wait
        const wait1Node = builder.createNode('number', 1600, 250, { value: '0.25' });
        const addWait1Node = builder.createNode('melodicodeScriptWait', 1850, 250, {});

        // Note 2: E4
        const note2Node = builder.createNode('melodicodeNoteSelector', 2100, 300, { dropdownValue: 'E4' });
        const duration2Node = builder.createNode('number', 2100, 450, { value: '0.5' });
        const addTone2Node = builder.createNode('melodicodeScriptTone', 2350, 350, { dropdownValue: 'sine' });

        // Wait
        const wait2Node = builder.createNode('number', 2600, 400, { value: '0.25' });
        const addWait2Node = builder.createNode('melodicodeScriptWait', 2850, 400, {});

        // Note 3: G4
        const note3Node = builder.createNode('melodicodeNoteSelector', 3100, 450, { dropdownValue: 'G4' });
        const duration3Node = builder.createNode('number', 3100, 600, { value: '0.5' });
        const addTone3Node = builder.createNode('melodicodeScriptTone', 3350, 500, { dropdownValue: 'sine' });

        // Wait
        const wait3Node = builder.createNode('number', 3600, 550, { value: '0.5' });
        const addWait3Node = builder.createNode('melodicodeScriptWait', 3850, 550, {});

        // Slide from G4 to C5
        const slideStartNode = builder.createNode('melodicodeNoteSelector', 4100, 600, { dropdownValue: 'G4' });
        const slideEndNode = builder.createNode('melodicodeNoteSelector', 4100, 750, { dropdownValue: 'C5' });
        const slideDurationNode = builder.createNode('number', 4100, 900, { value: '1' });
        const addSlideNode = builder.createNode('melodicodeScriptSlide', 4350, 700, { dropdownValue: 'sawtooth' });

        // End main block
        const endMainBlockNode = builder.createNode('melodicodeScriptBlockEnd', 4600, 750, {});

        // Create drums block
        const drumsBlockNameNode = builder.createNode('string', 100, 1100, { value: 'drums' });
        const startDrumsBlockNode = builder.createNode('melodicodeScriptBlockStart', 350, 1100, {});

        // Kick drum
        const kickSampleNode = builder.createNode('string', 600, 1150, { value: 'kick' });
        const addKickNode = builder.createNode('melodicodeScriptSample', 850, 1150, {});

        // Wait
        const waitDrum1Node = builder.createNode('number', 1100, 1200, { value: '0.5' });
        const addWaitDrum1Node = builder.createNode('melodicodeScriptWait', 1350, 1200, {});

        // Snare
        const snareSampleNode = builder.createNode('string', 1600, 1250, { value: 'snare' });
        const addSnareNode = builder.createNode('melodicodeScriptSample', 1850, 1250, {});

        // Wait
        const waitDrum2Node = builder.createNode('number', 2100, 1300, { value: '0.5' });
        const addWaitDrum2Node = builder.createNode('melodicodeScriptWait', 2350, 1300, {});

        // End drums block
        const endDrumsBlockNode = builder.createNode('melodicodeScriptBlockEnd', 2600, 1300, {});

        // Play command - play both blocks together and loop drums 4 times
        const playBlocksNode = builder.createNode('string', 2850, 1350, { value: 'main' });
        const loopCountNode = builder.createNode('number', 2850, 1500, { value: '4' });
        const loopBlockNameNode = builder.createNode('string', 2850, 1650, { value: 'drums' });
        const addLoopNode = builder.createNode('melodicodeScriptLoop', 3100, 1500, {});

        // Final play command
        const finalPlayBlockNode = builder.createNode('string', 3350, 1550, { value: 'main' });
        const finalPlayNode = builder.createNode('melodicodeScriptPlay', 3600, 1550, {});

        // Start event to execute the MelodiCode script
        const startNode = builder.createNode('start', 3850, 1600, {});

        // Play the MelodiCode script
        const playMelodiCodeNode = builder.createNode('melodicodePlay', 4100, 1600, {});

        nodes.push(
            bpmValueNode, setBPMNode,
            mainBlockNameNode, startMainBlockNode,
            note1Node, duration1Node, addTone1Node,
            wait1Node, addWait1Node,
            note2Node, duration2Node, addTone2Node,
            wait2Node, addWait2Node,
            note3Node, duration3Node, addTone3Node,
            wait3Node, addWait3Node,
            slideStartNode, slideEndNode, slideDurationNode, addSlideNode,
            endMainBlockNode,
            drumsBlockNameNode, startDrumsBlockNode,
            kickSampleNode, addKickNode,
            waitDrum1Node, addWaitDrum1Node,
            snareSampleNode, addSnareNode,
            waitDrum2Node, addWaitDrum2Node,
            endDrumsBlockNode,
            playBlocksNode, loopCountNode, loopBlockNameNode, addLoopNode,
            finalPlayBlockNode, finalPlayNode,
            startNode, playMelodiCodeNode
        );

        // Build the MelodiCode script from top to bottom
        // BPM -> Main Block Start
        connections.push(
            { from: bpmValueNode.id, fromPort: 0, to: setBPMNode.id, toPort: 1 },
            { from: setBPMNode.id, fromPort: 0, to: startMainBlockNode.id, toPort: 0 },
            { from: mainBlockNameNode.id, fromPort: 0, to: startMainBlockNode.id, toPort: 1 }
        );

        // Main block melody sequence
        connections.push(
            { from: startMainBlockNode.id, fromPort: 0, to: addTone1Node.id, toPort: 0 },
            { from: note1Node.id, fromPort: 0, to: addTone1Node.id, toPort: 1 },
            { from: duration1Node.id, fromPort: 0, to: addTone1Node.id, toPort: 2 },

            { from: addTone1Node.id, fromPort: 0, to: addWait1Node.id, toPort: 0 },
            { from: wait1Node.id, fromPort: 0, to: addWait1Node.id, toPort: 1 },

            { from: addWait1Node.id, fromPort: 0, to: addTone2Node.id, toPort: 0 },
            { from: note2Node.id, fromPort: 0, to: addTone2Node.id, toPort: 1 },
            { from: duration2Node.id, fromPort: 0, to: addTone2Node.id, toPort: 2 },

            { from: addTone2Node.id, fromPort: 0, to: addWait2Node.id, toPort: 0 },
            { from: wait2Node.id, fromPort: 0, to: addWait2Node.id, toPort: 1 },

            { from: addWait2Node.id, fromPort: 0, to: addTone3Node.id, toPort: 0 },
            { from: note3Node.id, fromPort: 0, to: addTone3Node.id, toPort: 1 },
            { from: duration3Node.id, fromPort: 0, to: addTone3Node.id, toPort: 2 },

            { from: addTone3Node.id, fromPort: 0, to: addWait3Node.id, toPort: 0 },
            { from: wait3Node.id, fromPort: 0, to: addWait3Node.id, toPort: 1 },

            { from: addWait3Node.id, fromPort: 0, to: addSlideNode.id, toPort: 0 },
            { from: slideStartNode.id, fromPort: 0, to: addSlideNode.id, toPort: 1 },
            { from: slideEndNode.id, fromPort: 0, to: addSlideNode.id, toPort: 2 },
            { from: slideDurationNode.id, fromPort: 0, to: addSlideNode.id, toPort: 3 },

            { from: addSlideNode.id, fromPort: 0, to: endMainBlockNode.id, toPort: 0 }
        );

        // Drums block sequence
        connections.push(
            { from: endMainBlockNode.id, fromPort: 0, to: startDrumsBlockNode.id, toPort: 0 },
            { from: drumsBlockNameNode.id, fromPort: 0, to: startDrumsBlockNode.id, toPort: 1 },

            { from: startDrumsBlockNode.id, fromPort: 0, to: addKickNode.id, toPort: 0 },
            { from: kickSampleNode.id, fromPort: 0, to: addKickNode.id, toPort: 1 },

            { from: addKickNode.id, fromPort: 0, to: addWaitDrum1Node.id, toPort: 0 },
            { from: waitDrum1Node.id, fromPort: 0, to: addWaitDrum1Node.id, toPort: 1 },

            { from: addWaitDrum1Node.id, fromPort: 0, to: addSnareNode.id, toPort: 0 },
            { from: snareSampleNode.id, fromPort: 0, to: addSnareNode.id, toPort: 1 },

            { from: addSnareNode.id, fromPort: 0, to: addWaitDrum2Node.id, toPort: 0 },
            { from: waitDrum2Node.id, fromPort: 0, to: addWaitDrum2Node.id, toPort: 1 },

            { from: addWaitDrum2Node.id, fromPort: 0, to: endDrumsBlockNode.id, toPort: 0 }
        );

        // Add loop and play commands
        connections.push(
            { from: endDrumsBlockNode.id, fromPort: 0, to: addLoopNode.id, toPort: 0 },
            { from: loopCountNode.id, fromPort: 0, to: addLoopNode.id, toPort: 1 },
            { from: loopBlockNameNode.id, fromPort: 0, to: addLoopNode.id, toPort: 2 },

            { from: addLoopNode.id, fromPort: 0, to: finalPlayNode.id, toPort: 0 },
            { from: finalPlayBlockNode.id, fromPort: 0, to: finalPlayNode.id, toPort: 1 }
        );

        // Execute on start
        connections.push(
            { from: startNode.id, fromPort: 0, to: playMelodiCodeNode.id, toPort: 0 },
            { from: finalPlayNode.id, fromPort: 0, to: playMelodiCodeNode.id, toPort: 1 }
        );

        return {
            moduleName: 'MelodiCodeAudio',
            moduleNamespace: 'Audio',
            moduleDescription: 'Example showing how to create music using MelodiCode script building nodes with melody, drums, and slides',
            moduleIcon: 'fas fa-music',
            moduleColor: '#9B59B6',
            allowMultiple: true,
            drawInEditor: false,
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
                    type: 'constructor',
                    label: 'Constructor',
                    color: '#263d4a',
                    icon: 'fas fa-drafting-compass',
                    outputs: ['flow'],
                    codeGen: (node, ctx) => ''
                },
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
                        return `${varName}`;
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

                        return `this.${propName}`;
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
                            return `this.${propName} = ${propValue}; // Exposed Property (See below)`;
                        } else {
                            return `this.${propName} = ${propValue}; // Hidden Property`;
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
                    type: 'waveType',
                    label: 'Wave Type',
                    color: '#3d4a78',
                    icon: 'fas fa-wave-square',
                    inputs: [],
                    outputs: ['value'],
                    hasDropdown: true,
                    dropdownOptions: ['sine', 'square', 'triangle', 'sawtooth'],
                    defaultValue: 'sine',
                    codeGen: (node, ctx) => {
                        const waveType = node.dropdownValue || 'sine';
                        return `'${waveType}'`;
                    }
                },
                {
                    type: 'randomNumber',
                    label: 'Random Number',
                    color: '#4a3678',
                    icon: 'fas fa-dice',
                    inputs: [],
                    outputs: ['value'],
                    codeGen: (node, ctx) => 'Math.random()'
                },
                {
                    type: 'randomSeededNumber',
                    label: 'Random Seeded Number',
                    color: '#553978',
                    icon: 'fas fa-dice-six',
                    inputs: ['seed'],
                    outputs: ['value'],
                    codeGen: (node, ctx) => `Math.random(${ctx.getInputValue(node, 'seed') || '0'})`
                },
                {
                    type: 'randomRange',
                    label: 'Random Range',
                    color: '#603a78',
                    icon: 'fas fa-dice-d20',
                    inputs: ['min', 'max'],
                    outputs: ['value'],
                    hasInput: true,
                    codeGen: (node, ctx) => {
                        const min = ctx.getInputValue(node, 'min') || '0';
                        const max = ctx.getInputValue(node, 'max') || '1';
                        return `(Math.random() * (${max} - ${min}) + ${min})`;
                    }
                },
                {
                    type: 'randomName',
                    label: 'Random Name',
                    color: '#5a4078',
                    icon: 'fas fa-user-tag',
                    inputs: [],
                    outputs: ['value'],
                    hasDropdown: true,
                    dropdownOptions: [
                        'random', 'medieval', 'fantasy_elf', 'fantasy_dwarf', 'fantasy_orc',
                        'scientific', 'alien_species', 'alien_personal', 'cyberpunk',
                        'native_american', 'japanese', 'viking', 'roman', 'pirate',
                        'steampunk', 'lovecraftian', 'demon', 'angelic', 'egyptian',
                        'greek', 'zombie', 'robot', 'superhero', 'dragon', 'witch',
                        'werewolf', 'vampire', 'aztec', 'celtic', 'pokemon', 'starwars',
                        'cosmic', 'modern_male', 'modern_female', 'caveman', 'cavewoman',
                        'mobster', 'cowboy', 'ninja', 'samurai', 'wizard_modern',
                        'witch_modern', 'fairy', 'mermaid', 'merman', 'alien_scientist',
                        'space_captain', 'demon_hunter', 'ghost', 'frankenstein',
                        'serial_killer', 'detective', 'spy', 'gladiator', 'pro_wrestler',
                        'rockstar', 'rapper', 'mad_scientist', 'time_traveler', 'kaiju',
                        'biblical', 'archangel', 'fallen_angel', 'greek_god', 'norse_god',
                        'titan', 'video_game_boss', 'final_fantasy', 'dark_souls',
                        'elder_scrolls', 'world_of_warcraft', 'fortnite', 'league_of_legends',
                        'minecraft', 'Among_Us', 'tiktok_username', 'twitch_streamer',
                        'esports_player', 'youtube_gamer', 'phoneme_based'
                    ],
                    defaultValue: 'random',
                    isGroup: false,
                    codeGen: (node, ctx) => {
                        const category = node.dropdownValue || 'random';
                        if (category === 'random') {
                            return `window.nameGen.generateRandomCrazy()`;
                        } else if (category === 'phoneme_based') {
                            // Fixed: Generate the random syllable count at runtime, not at code generation time
                            return `window.nameGen.generatePhoneme(Math.floor(Math.random() * 3) + 2)`;
                        } else {
                            return `window.nameGen.generate('${category}')`;
                        }
                    }
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
                    directOutput: true,
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
                    outputs: ['flow'],
                    codeGen: (node, ctx) => {
                        const x = ctx.getInputValue(node, 'x') || 0;
                        const y = ctx.getInputValue(node, 'y') || 0;
                        const w = ctx.getInputValue(node, 'w') || 32;
                        const h = ctx.getInputValue(node, 'h') || 32;
                        const color = ctx.getInputValue(node, 'color') || "'#000000'";
                        return `ctx.fillStyle = ${color};\n${ctx.indent}ctx.fillRect(${x} - ${w}/2, ${y} - ${h}/2, ${w}, ${h});`;
                    }
                },
                {
                    type: 'strokeRect',
                    label: 'Stroke Rect',
                    color: '#63162f',
                    icon: 'fas fa-square-full',
                    inputs: ['flow', 'ctx', 'x', 'y', 'w', 'h', 'color'],
                    outputs: ['flow'],
                    codeGen: (node, ctx) => {
                        const x = ctx.getInputValue(node, 'x') || 0;
                        const y = ctx.getInputValue(node, 'y') || 0;
                        const w = ctx.getInputValue(node, 'w') || 32;
                        const h = ctx.getInputValue(node, 'h') || 32;
                        const color = ctx.getInputValue(node, 'color') || "'#000000'";
                        return `ctx.strokeStyle = ${color};\n${ctx.indent}ctx.strokeRect(${x} - ${w}/2, ${y} - ${h}/2, ${w}, ${h});`;
                    }
                },
                {
                    type: 'fillCircle',
                    label: 'Fill Circle',
                    color: '#6a2236',
                    icon: 'fas fa-circle',
                    inputs: ['flow', 'ctx', 'x', 'y', 'radius', 'color'],
                    outputs: ['flow'],
                    codeGen: (node, ctx) => `ctx.fillStyle = ${ctx.getInputValue(node, 'color') || "'#000000'"};\n${ctx.indent}ctx.beginPath();\n${ctx.indent}ctx.arc(${ctx.getInputValue(node, 'x') || 0}, ${ctx.getInputValue(node, 'y') || 0}, ${ctx.getInputValue(node, 'radius') || 16}, 0, Math.PI * 2);\n${ctx.indent}ctx.fill();`
                },
                {
                    type: 'drawText',
                    label: 'Draw Text',
                    color: '#712e3d',
                    icon: 'fas fa-font',
                    inputs: ['flow', 'ctx', 'text', 'x', 'y', 'color', 'fontSize', 'fontFamily', 'fontWeight', 'textAlign', 'textBaseline'],
                    outputs: ['flow'],
                    codeGen: (node, ctx) => {
                        const fontSize = ctx.getInputValue(node, 'fontSize') || '16';
                        const fontFamily = ctx.getInputValue(node, 'fontFamily') || "'Arial'";
                        const fontWeight = ctx.getInputValue(node, 'fontWeight') || "'normal'";
                        const textAlign = ctx.getInputValue(node, 'textAlign') || "'center'";
                        const textBaseline = ctx.getInputValue(node, 'textBaseline') || "'middle'";
                        const color = ctx.getInputValue(node, 'color') || "'#000000'";
                        const text = ctx.getInputValue(node, 'text') || "''";
                        const x = ctx.getInputValue(node, 'x') || 0;
                        const y = ctx.getInputValue(node, 'y') || 0;

                        // Build font string properly - ensure quotes are stripped and re-added correctly
                        const cleanFontWeight = fontWeight.replace(/^['"]|['"]$/g, '');
                        const cleanFontFamily = fontFamily.replace(/^['"]|['"]$/g, '');
                        const cleanTextAlign = textAlign.replace(/^['"]|['"]$/g, '');
                        const cleanTextBaseline = textBaseline.replace(/^['"]|['"]$/g, '');

                        return `ctx.font = '${cleanFontWeight} ${fontSize}px ${cleanFontFamily}';\n${ctx.indent}ctx.textAlign = '${cleanTextAlign}';\n${ctx.indent}ctx.textBaseline = '${cleanTextBaseline}';\n${ctx.indent}ctx.fillStyle = ${color};\n${ctx.indent}ctx.fillText(${text}, ${x}, ${y});`;
                    }
                },
                {
                    type: 'drawLine',
                    label: 'Draw Line',
                    color: '#783a44',
                    icon: 'fas fa-slash',
                    inputs: ['flow', 'ctx', 'x1', 'y1', 'x2', 'y2', 'color'],
                    outputs: ['flow'],
                    codeGen: (node, ctx) => `ctx.strokeStyle = ${ctx.getInputValue(node, 'color') || "'#000'"};\n${ctx.indent}ctx.beginPath();\n${ctx.indent}ctx.moveTo(${ctx.getInputValue(node, 'x1') || 0}, ${ctx.getInputValue(node, 'y1') || 0});\n${ctx.indent}ctx.lineTo(${ctx.getInputValue(node, 'x2') || 0}, ${ctx.getInputValue(node, 'y2') || 32});\n${ctx.indent}ctx.stroke();`
                },
                {
                    type: 'setLineWidth',
                    label: 'Set Line Width',
                    color: '#520824',
                    icon: 'fas fa-ruler-horizontal',
                    inputs: ['flow', 'ctx', 'width'],
                    outputs: ['flow'],
                    codeGen: (node, ctx) => `ctx.lineWidth = ${ctx.getInputValue(node, 'width') || 1};`
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
                    dropdownOptions: Object.keys(window.key),
                    defaultValue: 'a',
                    codeGen: (node, ctx) => {
                        const key = node.dropdownValue || 'a';
                        return `window.key.${key}`;
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
                    directOutput: true, // <=== NEW FLAG: codeGen returns complete value
                    codeGen: (node, ctx) => `window.input.keyDown(${ctx.getInputValue(node, 'key') || 'a'})`
                },
                {
                    type: 'keyPressed',
                    label: 'Key Pressed',
                    color: '#1e4152',
                    icon: 'fas fa-keyboard',
                    inputs: ['flow', 'key'],
                    outputs: ['flow', 'result'],
                    directOutput: true, // <=== NEW FLAG: codeGen returns complete value
                    codeGen: (node, ctx) => `window.input.keyPressed(${ctx.getInputValue(node, 'key') || 'a'})`
                },
                {
                    type: 'keyReleased',
                    label: 'Key Released',
                    color: '#22495d',
                    icon: 'fas fa-keyboard',
                    inputs: ['flow', 'key'],
                    outputs: ['flow', 'result'],
                    directOutput: true, // <=== NEW FLAG: codeGen returns complete value
                    codeGen: (node, ctx) => `window.input.keyReleased(${ctx.getInputValue(node, 'key') || 'a'})`
                },
                // Mouse Input Nodes
                {
                    type: 'mouseDown',
                    label: 'Mouse Down',
                    color: '#265268',
                    icon: 'fas fa-computer-mouse',
                    inputs: ['flow', 'button'],
                    outputs: ['flow', 'result'],
                    directOutput: true,
                    codeGen: (node, ctx) => `window.input.mouseDown(${ctx.getInputValue(node, 'button') || 'left'})`
                },
                {
                    type: 'mousePressed',
                    label: 'Mouse Pressed',
                    color: '#2a5a73',
                    icon: 'fas fa-computer-mouse',
                    inputs: ['flow', 'button'],
                    outputs: ['flow', 'result'],
                    directOutput: true,
                    codeGen: (node, ctx) => `window.input.mousePressed(${ctx.getInputValue(node, 'button') || 'left'})`
                },
                {
                    type: 'mouseReleased',
                    label: 'Mouse Released',
                    color: '#2e637e',
                    icon: 'fas fa-computer-mouse',
                    inputs: ['flow', 'button'],
                    outputs: ['flow', 'result'],
                    directOutput: true,
                    codeGen: (node, ctx) => `window.input.mouseReleased(${ctx.getInputValue(node, 'button') || 'left'})`
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
                    directOutput: true,
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
                    directOutput: true,
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
                    directOutput: true,
                    codeGen: (node, ctx) => `window.input.didMouseMove()`
                },
                {
                    type: 'getMouseWheelDelta',
                    label: 'Get Mouse Wheel',
                    color: '#428db5',
                    icon: 'fas fa-circle-dot',
                    inputs: [],
                    outputs: ['value'],
                    directOutput: true,
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
                    directOutput: true,
                    codeGen: (node, ctx) => `window.input.getTouchCount()`
                },
                {
                    type: 'isTapped',
                    label: 'Is Tapped',
                    color: '#1f3847',
                    icon: 'fas fa-hand-point-up',
                    inputs: [],
                    outputs: ['result'],
                    directOutput: true,
                    codeGen: (node, ctx) => `window.input.isTapped()`
                },
                {
                    type: 'isLongPressed',
                    label: 'Is Long Pressed',
                    color: '#234051',
                    icon: 'fas fa-hand-back-fist',
                    inputs: [],
                    outputs: ['result'],
                    directOutput: true,
                    codeGen: (node, ctx) => `window.input.isLongPressed()`
                },
                {
                    type: 'isPinching',
                    label: 'Is Pinching',
                    color: '#27495b',
                    icon: 'fas fa-hands',
                    inputs: [],
                    outputs: ['result'],
                    directOutput: true,
                    codeGen: (node, ctx) => `window.input.isPinching()`
                },
                {
                    type: 'getPinchScale',
                    label: 'Get Pinch Scale',
                    color: '#2b5165',
                    icon: 'fas fa-expand',
                    inputs: [],
                    outputs: ['value'],
                    directOutput: true,
                    codeGen: (node, ctx) => `(window.input.getPinchData()?.scale || 1)`
                },
                {
                    type: 'getSwipeDirection',
                    label: 'Get Swipe Direction',
                    color: '#2f5a6f',
                    icon: 'fas fa-hand-pointer',
                    inputs: [],
                    outputs: ['direction'],
                    directOutput: true,
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
                    directOutput: true,
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
                    directOutput: true,
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
                },
                {
                    type: 'commentBlock',
                    label: 'Comment Block',
                    color: '#3d4549',
                    icon: 'fas fa-comments',
                    inputs: ['flow', 'line1', 'line2', 'line3', 'line4', 'line5'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => {
                        const lines = [];
                        for (let i = 1; i <= 5; i++) {
                            const line = ctx.getInputValue(node, `line${i}`);
                            if (line) {
                                lines.push(line);
                            }
                        }
                        return `/* 
    ${node.value || 'Comment Block'}
    ${lines.join('\n    ')}
                        */`;
                    }
                },
                {
                    type: 'divider',
                    label: 'Divider',
                    color: '#40474b',
                    icon: 'fas fa-arrows-alt-h',
                    inputs: ['flow', 'input'],
                    outputs: ['flow', 'value'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => {
                        const inputValue = ctx.getInputValue(node, 'input');
                        if (inputValue) {
                            return `/* ------------------------ */
${ctx.indent}${inputValue}
${ctx.indent}/* ------------------------ */`
                        }
                        return `/* ------------------------ */`;
                    }
                }
            ],
            'MelodiCode': [
                // Core Interpreter Node - This accumulates all script commands
                {
                    type: 'melodicodeInterpreter',
                    label: 'MelodiCode Interpreter',
                    color: '#4a1f4a',
                    icon: 'fas fa-code',
                    inputs: ['scriptFlow'],
                    outputs: ['script'],
                    codeGen: (node, ctx) => {
                        // Get the accumulated script from the flow
                        const script = ctx.getInputValue(node, 'scriptFlow') || "''";
                        return script;
                    }
                },
                // Core Playback Nodes
                {
                    type: 'melodicodePlay',
                    label: 'Play MelodiCode',
                    color: '#8b2f8b',
                    icon: 'fas fa-music',
                    inputs: ['flow', 'code', 'bpm'],
                    outputs: ['flow', 'success'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => {
                        const code = ctx.getInputValue(node, 'code');
                        const bpm = ctx.getInputValue(node, 'bpm') || '120';
                        return `window.melodicode.play(${code}, { bpm: ${bpm} })`;
                    }
                },
                {
                    type: 'melodicodeStop',
                    label: 'Stop MelodiCode',
                    color: '#7a1f7a',
                    icon: 'fas fa-stop',
                    inputs: ['flow'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => `window.melodicode.stop();`
                },
                {
                    type: 'melodicodeIsPlaying',
                    label: 'Is Playing',
                    color: '#6b106b',
                    icon: 'fas fa-circle-play',
                    inputs: [],
                    outputs: ['result'],
                    codeGen: (node, ctx) => `window.melodicode.getIsPlaying()`
                },
                // Simple Playback Methods
                {
                    type: 'melodicodePlayBeat',
                    label: 'Play Beat',
                    color: '#9b3f9b',
                    icon: 'fas fa-drum',
                    inputs: ['flow', 'pattern', 'bpm'],
                    outputs: ['flow', 'success'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => {
                        const pattern = ctx.getInputValue(node, 'pattern');
                        const bpm = ctx.getInputValue(node, 'bpm') || '120';
                        return `window.melodicode.playBeat(${pattern}, ${bpm})`;
                    }
                },
                {
                    type: 'melodicodePlayMelody',
                    label: 'Play Melody',
                    color: '#ab4fab',
                    icon: 'fas fa-music',
                    inputs: ['flow', 'notes', 'duration', 'bpm'],
                    outputs: ['flow', 'success'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => {
                        const notes = ctx.getInputValue(node, 'notes');
                        const duration = ctx.getInputValue(node, 'duration') || '1';
                        const bpm = ctx.getInputValue(node, 'bpm') || '120';
                        return `await window.melodicode.playMelody(${notes}, ${duration}, ${bpm})`;
                    }
                },
                {
                    type: 'melodicodePlaySample',
                    label: 'Play Sample',
                    color: '#bb5fbb',
                    icon: 'fas fa-compact-disc',
                    inputs: ['flow', 'sample', 'pitch', 'timescale', 'volume', 'pan'],
                    outputs: ['flow', 'success'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => {
                        const sample = ctx.getInputValue(node, 'sample');
                        const pitch = ctx.getInputValue(node, 'pitch') || '1';
                        const timescale = ctx.getInputValue(node, 'timescale') || '1';
                        const volume = ctx.getInputValue(node, 'volume') || '0.8';
                        const pan = ctx.getInputValue(node, 'pan') || '0';
                        return `window.melodicode.playSample(${sample}, { pitch: ${pitch}, timescale: ${timescale}, volume: ${volume}, pan: ${pan} })`;
                    }
                },
                {
                    type: 'melodicodePlayTone',
                    label: 'Play Tone',
                    color: '#cb6fcb',
                    icon: 'fas fa-wave-square',
                    inputs: ['flow', 'frequency', 'duration', 'waveType', 'volume', 'pan', 'bpm'],
                    outputs: ['flow', 'success'],
                    wrapFlowNode: false,
                    hasDropdown: true,
                    dropdownOptions: ['sine', 'square', 'sawtooth', 'triangle'],
                    defaultValue: 'sine',
                    codeGen: (node, ctx) => {
                        const frequency = ctx.getInputValue(node, 'frequency');
                        const duration = ctx.getInputValue(node, 'duration') || '1';
                        const waveType = node.dropdownValue || 'sine';
                        const volume = ctx.getInputValue(node, 'volume') || '0.8';
                        const pan = ctx.getInputValue(node, 'pan') || '0';
                        const bpm = ctx.getInputValue(node, 'bpm') || '120';
                        return `window.melodicode.playTone(${frequency}, ${duration}, '${waveType}', { volume: ${volume}, pan: ${pan}, bpm: ${bpm} })`;
                    }
                },
            ],
            'MelodiCode Script Builder': [
                // MelodiCode Script Builder Nodes (with cascading flow)
                {
                    type: 'melodicodeScriptInit',
                    label: 'Script Start',
                    color: '#2a1a2a',
                    icon: 'fas fa-play',
                    inputs: [],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        return "''";
                    }
                },
                {
                    type: 'melodicodeScriptTone',
                    label: 'Add Tone',
                    color: '#5a2f5a',
                    icon: 'fas fa-music',
                    inputs: ['scriptFlow', 'note', 'duration', 'waveType', 'volume', 'pan'],
                    outputs: ['scriptFlow'],
                    hasDropdown: true,
                    dropdownOptions: ['sine', 'square', 'sawtooth', 'triangle'],
                    defaultValue: 'sine',
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const note = ctx.getInputValue(node, 'note') || "'C4'";
                        const duration = ctx.getInputValue(node, 'duration') || '1';
                        const waveType = node.dropdownValue || 'sine';
                        const volume = ctx.getInputValue(node, 'volume') || '0.8';
                        const pan = ctx.getInputValue(node, 'pan') || '0';
                        return `${prevScript} + 'tone ' + ${note} + ' ' + ${duration} + ' ${waveType} ' + ${volume} + ' ' + ${pan} + '\\n'`;
                    }
                },
                {
                    type: 'melodicodeScriptSample',
                    label: 'Add Sample',
                    color: '#6a3f6a',
                    icon: 'fas fa-drum',
                    inputs: ['scriptFlow', 'sample', 'pitch', 'timescale', 'volume', 'pan'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const sample = ctx.getInputValue(node, 'sample');
                        const pitch = ctx.getInputValue(node, 'pitch') || '1';
                        const timescale = ctx.getInputValue(node, 'timescale') || '1';
                        const volume = ctx.getInputValue(node, 'volume') || '0.8';
                        const pan = ctx.getInputValue(node, 'pan') || '0';
                        return `${prevScript} + 'sample ' + ${sample} + ' ' + ${pitch} + ' ' + ${timescale} + ' ' + ${volume} + ' ' + ${pan} + '\\n'`;
                    }
                },
                {
                    type: 'melodicodeScriptSlide',
                    label: 'Add Slide',
                    color: '#7a4f7a',
                    icon: 'fas fa-arrow-trend-up',
                    inputs: ['scriptFlow', 'startNote', 'endNote', 'duration', 'waveType', 'volume', 'pan'],
                    outputs: ['scriptFlow'],
                    hasDropdown: true,
                    dropdownOptions: ['sine', 'square', 'sawtooth', 'triangle'],
                    defaultValue: 'sine',
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const startNote = ctx.getInputValue(node, 'startNote') || "'C4'";
                        const endNote = ctx.getInputValue(node, 'endNote') || "'C5'";
                        const duration = ctx.getInputValue(node, 'duration') || '1';
                        const waveType = node.dropdownValue || 'sine';
                        const volume = ctx.getInputValue(node, 'volume') || '0.8';
                        const pan = ctx.getInputValue(node, 'pan') || '0';
                        return `${prevScript} + 'slide ' + ${startNote} + ' ' + ${endNote} + ' ' + ${duration} + ' ${waveType} ' + ${volume} + ' ' + ${pan} + '\\n'`;
                    }
                },
                {
                    type: 'melodicodeScriptWait',
                    label: 'Add Wait',
                    color: '#4a2f4a',
                    icon: 'fas fa-clock',
                    inputs: ['scriptFlow', 'duration'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const duration = ctx.getInputValue(node, 'duration') || '1';
                        return `${prevScript} + 'wait ' + ${duration} + '\\n'`;
                    }
                },
                {
                    type: 'melodicodeScriptPattern',
                    label: 'Add Pattern',
                    color: '#8a5f8a',
                    icon: 'fas fa-grid',
                    inputs: ['scriptFlow', 'sample', 'pattern'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const sample = ctx.getInputValue(node, 'sample');
                        const pattern = ctx.getInputValue(node, 'pattern');
                        return `${prevScript} + 'pattern ' + ${sample} + ' ' + ${pattern} + '\\n'`;
                    }
                },
                {
                    type: 'melodicodeScriptSequence',
                    label: 'Add Sequence',
                    color: '#9a6f9a',
                    icon: 'fas fa-list',
                    inputs: ['scriptFlow', 'baseName', 'samples'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const baseName = ctx.getInputValue(node, 'baseName');
                        const samples = ctx.getInputValue(node, 'samples');
                        return `${prevScript} + 'sequence ' + ${baseName} + ' ' + ${samples} + '\\n'`;
                    }
                },
                {
                    type: 'melodicodeScriptTTS',
                    label: 'Add TTS',
                    color: '#aa7faa',
                    icon: 'fas fa-comment',
                    inputs: ['scriptFlow', 'text', 'speed', 'pitch', 'voice'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const text = ctx.getInputValue(node, 'text');
                        const speed = ctx.getInputValue(node, 'speed') || '1';
                        const pitch = ctx.getInputValue(node, 'pitch') || '1';
                        const voice = ctx.getInputValue(node, 'voice') || '0';
                        return `${prevScript} + 'tts "' + ${text} + '" ' + ${speed} + ' ' + ${pitch} + ' ' + ${voice} + '\\n'`;
                    }
                },
                // CONSOLIDATED NODE: Complete Block (Start + Content + End)
                {
                    type: 'melodicodeScriptCompleteBlock',
                    label: 'Complete Block',
                    color: '#ca8fca',
                    icon: 'fas fa-cube',
                    inputs: ['scriptFlow', 'blockName', 'effects', 'content'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const blockName = ctx.getInputValue(node, 'blockName');
                        const effects = ctx.getInputValue(node, 'effects') || "''";
                        const content = ctx.getInputValue(node, 'content') || "''";
                        return `${prevScript} + '[' + ${blockName} + '] ' + ${effects} + '\\n' + ${content} + '[end]\\n'`;
                    }
                },
                // Block Structure Nodes
                /*{
                    type: 'melodicodeScriptBlockStart',
                    label: 'Start Block',
                    color: '#ba8fba',
                    icon: 'fas fa-box-open',
                    inputs: ['scriptFlow', 'blockName', 'effects'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const blockName = ctx.getInputValue(node, 'blockName');
                        const effects = ctx.getInputValue(node, 'effects') || "''";
                        return `${prevScript} + '[' + ${blockName} + '] ' + ${effects} + '\\n'`;
                    }
                },
                {
                    type: 'melodicodeScriptBlockEnd',
                    label: 'End Block',
                    color: '#ca9fca',
                    icon: 'fas fa-box',
                    inputs: ['scriptFlow'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        return `${prevScript} + '[end]\\n'`;
                    }
                },*/
                {
                    type: 'melodicodeScriptCompleteSampleBlock',
                    label: 'Complete Sample Block',
                    color: '#da7fda',
                    icon: 'fas fa-drum-steelpan',
                    inputs: ['scriptFlow', 'blockName', 'content'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const blockName = ctx.getInputValue(node, 'blockName');
                        const content = ctx.getInputValue(node, 'content') || "''";
                        return `${prevScript} + '<' + ${blockName} + '>\\n' + ${content} + '<end>\\n'`;
                    }
                },
                /*{
                    type: 'melodicodeScriptSampleBlockStart',
                    label: 'Start Sample Block',
                    color: '#da8fda',
                    icon: 'fas fa-layer-group',
                    inputs: ['scriptFlow', 'blockName'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const blockName = ctx.getInputValue(node, 'blockName');
                        return `${prevScript} + '<' + ${blockName} + '>\\n'`;
                    }
                },
                {
                    type: 'melodicodeScriptSampleBlockEnd',
                    label: 'End Sample Block',
                    color: '#ea9fea',
                    icon: 'fas fa-layer-group',
                    inputs: ['scriptFlow'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        return `${prevScript} + '<end>\\n'`;
                    }
                },*/
                // Control Commands
                {
                    type: 'melodicodeScriptBPM',
                    label: 'Set BPM',
                    color: '#3a1f3a',
                    icon: 'fas fa-gauge',
                    inputs: ['scriptFlow', 'bpm'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const bpm = ctx.getInputValue(node, 'bpm') || '120';
                        return `${prevScript} + 'bpm ' + ${bpm} + '\\n'`;
                    }
                },
                {
                    type: 'melodicodeScriptPlay',
                    label: 'Add Play',
                    color: '#da9fda',
                    icon: 'fas fa-play',
                    inputs: ['scriptFlow', 'blocks'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const blocks = ctx.getInputValue(node, 'blocks');
                        return `${prevScript} + 'play ' + ${blocks} + '\\n'`;
                    }
                },
                {
                    type: 'melodicodeScriptLoop',
                    label: 'Add Loop',
                    color: '#ea9fea',
                    icon: 'fas fa-repeat',
                    inputs: ['scriptFlow', 'count', 'blocks'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const count = ctx.getInputValue(node, 'count');
                        const blocks = ctx.getInputValue(node, 'blocks');
                        return `${prevScript} + 'loop ' + ${count} + ' ' + ${blocks} + '\\n'`;
                    }
                },
                {
                    type: 'melodicodeScriptSidechain',
                    label: 'Add Sidechain',
                    color: '#fa9ffa',
                    icon: 'fas fa-compress',
                    inputs: ['scriptFlow', 'block1', 'block2', 'amount'],
                    outputs: ['scriptFlow'],
                    codeGen: (node, ctx) => {
                        const prevScript = ctx.getInputValue(node, 'scriptFlow') || "''";
                        const block1 = ctx.getInputValue(node, 'block1');
                        const block2 = ctx.getInputValue(node, 'block2');
                        const amount = ctx.getInputValue(node, 'amount') || '0.7';
                        return `${prevScript} + 'sidechain ' + ${block1} + ' ' + ${block2} + ' ' + ${amount} + '\\n'`;
                    }
                },
                {
                    type: 'melodicodeScriptEffect',
                    label: 'Effect String',
                    color: '#1a0f1a',
                    icon: 'fas fa-wand-magic-sparkles',
                    inputs: ['effectType', 'params'],
                    outputs: ['effect'],
                    hasDropdown: true,
                    dropdownOptions: ['reverb', 'delay', 'filter', 'distortion', 'chorus'],
                    defaultValue: 'reverb',
                    codeGen: (node, ctx) => {
                        const effectType = node.dropdownValue || 'reverb';
                        const params = ctx.getInputValue(node, 'params') || '0.3';
                        return `'(${effectType} ' + ${params} + ')'`;
                    }
                },
                // Utility Nodes
                {
                    type: 'melodicodeGetSamples',
                    label: 'Get Available Samples',
                    color: '#db7fdb',
                    icon: 'fas fa-list-ul',
                    inputs: [],
                    outputs: ['samples'],
                    codeGen: (node, ctx) => `window.melodicode.getAvailableSamples()`
                },
                {
                    type: 'melodicodeSetVolume',
                    label: 'Set Master Volume',
                    color: '#eb8feb',
                    icon: 'fas fa-volume-high',
                    inputs: ['flow', 'volume'],
                    outputs: ['flow'],
                    wrapFlowNode: false,
                    codeGen: (node, ctx) => {
                        const volume = ctx.getInputValue(node, 'volume') || '1';
                        return `window.melodicode.setMasterVolume(${volume});`;
                    }
                },
                {
                    type: 'waveType',
                    label: 'Wave Type',
                    color: '#3d4a78',
                    icon: 'fas fa-wave-square',
                    inputs: [],
                    outputs: ['value'],
                    hasDropdown: true,
                    dropdownOptions: ['sine', 'square', 'triangle', 'sawtooth'],
                    defaultValue: 'sine',
                    codeGen: (node, ctx) => {
                        const waveType = node.dropdownValue || 'sine';
                        return `'${waveType}'`;
                    }
                },
                // Note Selector
                {
                    type: 'melodicodeNoteSelector',
                    label: 'Note',
                    color: '#fb9ffb',
                    icon: 'fas fa-music',
                    inputs: [],
                    outputs: ['note'],
                    hasDropdown: true,
                    dropdownOptions: [
                        'C0', 'C#0', 'D0', 'D#0', 'E0', 'F0', 'F#0', 'G0', 'G#0', 'A0', 'A#0', 'B0',
                        'C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1',
                        'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2',
                        'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
                        'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
                        'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5',
                        'C6', 'C#6', 'D6', 'D#6', 'E6', 'F6', 'F#6', 'G6', 'G#6', 'A6', 'A#6', 'B6',
                        'C7', 'C#7', 'D7', 'D#7', 'E7', 'F7', 'F#7', 'G7', 'G#7', 'A7', 'A#7', 'B7',
                        'C8'
                    ],
                    defaultValue: 'C4',
                    codeGen: (node, ctx) => {
                        const note = node.dropdownValue || 'C4';
                        return `'${note}'`;
                    }
                },
                {
                    type: 'melodicodeSampleSelector',
                    label: 'Sample',
                    color: '#8a5f8a',
                    icon: 'fas fa-drum',
                    inputs: [],
                    outputs: ['sample'],
                    hasDropdown: true,
                    dropdownOptions: [
                        // Drums
                        'kick', 'snare', 'hihat', 'hihat_open', 'crash', 'ride',
                        'tom_high', 'tom_mid', 'tom_low', 'clap', 'triangle',
                        // Bass
                        'bass_low', 'bass_mid', 'bass_high', 'sub_bass', 'bass_pluck',
                        // Synth Leads
                        'lead_1', 'lead_2', 'lead_bright', 'lead_soft',
                        // Pads
                        'pad_1', 'pad_warm', 'pad_strings', 'pad_choir',
                        // Percussion
                        'shaker', 'tambourine', 'cowbell', 'woodblock',
                        // FX
                        'whoosh', 'zap', 'drop', 'rise'
                    ],
                    defaultValue: 'kick',
                    codeGen: (node, ctx) => {
                        const sample = node.dropdownValue || 'kick';
                        return `'${sample}'`;
                    }
                }
            ]
        };
    }
}

// Register globally
window.VMBExampleModules = VMBExampleModules;
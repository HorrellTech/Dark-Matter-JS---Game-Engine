function showVisualModuleBuilderHelp() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'vmb-help-modal-overlay';

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'vmb-help-modal';

    // Create modal content
    modal.innerHTML = `
            <div class="vmb-help-header">
                <h2><i class="fas fa-book"></i> Visual Module Builder Documentation</h2>
                <button class="vmb-help-close">&times;</button>
            </div>
            <div class="vmb-help-body">
                <div class="vmb-help-sidebar">
                    <div class="vmb-help-categories"></div>
                </div>
                <div class="vmb-help-content">
                    <div class="vmb-help-welcome">
                        <h3>Welcome to Visual Module Builder</h3>
                        <p>Select a topic from the left sidebar to learn more about creating visual modules.</p>
                        <div class="vmb-help-icon">
                            <i class="fas fa-project-diagram"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
            .vmb-help-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
                animation: vmb-fadeIn 0.2s ease-out;
            }
            
            @keyframes vmb-fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .vmb-help-modal {
                background: #1e1e1e;
                border-radius: 8px;
                width: 90%;
                max-width: 1000px;
                height: 80%;
                max-height: 700px;
                display: flex;
                flex-direction: column;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                animation: vmb-slideIn 0.3s ease-out;
                overflow: hidden;
            }
            
            @keyframes vmb-slideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .vmb-help-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px 24px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #764ba2;
            }
            
            .vmb-help-header h2 {
                margin: 0;
                color: white;
                font-size: 22px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .vmb-help-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                font-size: 28px;
                width: 36px;
                height: 36px;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                line-height: 1;
                padding: 0;
            }
            
            .vmb-help-close:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }
            
            .vmb-help-body {
                display: flex;
                flex: 1;
                overflow: hidden;
            }
            
            .vmb-help-sidebar {
                width: 280px;
                background: #252525;
                border-right: 1px solid #3a3a3a;
                overflow-y: auto;
                flex-shrink: 0;
            }
            
            .vmb-help-sidebar::-webkit-scrollbar {
                width: 8px;
            }
            
            .vmb-help-sidebar::-webkit-scrollbar-track {
                background: #1e1e1e;
            }
            
            .vmb-help-sidebar::-webkit-scrollbar-thumb {
                background: #444;
                border-radius: 4px;
            }
            
            .vmb-help-sidebar::-webkit-scrollbar-thumb:hover {
                background: #555;
            }
            
            .vmb-help-category {
                border-bottom: 1px solid #3a3a3a;
            }
            
            .vmb-help-category-header {
                padding: 14px 16px;
                background: #2a2a2a;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 600;
                color: #e0e0e0;
                transition: background 0.2s;
                user-select: none;
            }
            
            .vmb-help-category-header:hover {
                background: #2f2f2f;
            }
            
            .vmb-help-category-header.active {
                background: #667eea;
                color: white;
            }
            
            .vmb-help-category-icon {
                font-size: 10px;
                transition: transform 0.2s;
            }
            
            .vmb-help-category-icon.expanded {
                transform: rotate(90deg);
            }
            
            .vmb-help-topics {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease-out;
            }
            
            .vmb-help-topics.expanded {
                max-height: 500px;
            }
            
            .vmb-help-topic {
                padding: 10px 16px 10px 32px;
                cursor: pointer;
                color: #b0b0b0;
                transition: all 0.2s;
                border-left: 3px solid transparent;
            }
            
            .vmb-help-topic:hover {
                background: #2a2a2a;
                color: #e0e0e0;
                border-left-color: #667eea;
            }
            
            .vmb-help-topic.active {
                background: #2a2a2a;
                color: #667eea;
                border-left-color: #667eea;
                font-weight: 500;
            }
            
            .vmb-help-content {
                flex: 1;
                overflow-y: auto;
                padding: 24px 32px;
                color: #d0d0d0;
                line-height: 1.6;
            }
            
            .vmb-help-content::-webkit-scrollbar {
                width: 10px;
            }
            
            .vmb-help-content::-webkit-scrollbar-track {
                background: #1e1e1e;
            }
            
            .vmb-help-content::-webkit-scrollbar-thumb {
                background: #444;
                border-radius: 5px;
            }
            
            .vmb-help-content::-webkit-scrollbar-thumb:hover {
                background: #555;
            }
            
            .vmb-help-welcome {
                text-align: center;
                padding: 60px 20px;
            }
            
            .vmb-help-welcome h3 {
                color: #667eea;
                font-size: 28px;
                margin-bottom: 16px;
            }
            
            .vmb-help-welcome p {
                font-size: 16px;
                color: #b0b0b0;
            }
            
            .vmb-help-icon {
                margin-top: 40px;
                font-size: 120px;
                color: #667eea;
                opacity: 0.3;
            }
            
            .vmb-help-content h3 {
                color: #667eea;
                font-size: 24px;
                margin-top: 0;
                margin-bottom: 16px;
                padding-bottom: 8px;
                border-bottom: 2px solid #3a3a3a;
            }
            
            .vmb-help-content h4 {
                color: #888cff;
                font-size: 18px;
                margin-top: 24px;
                margin-bottom: 12px;
            }
            
            .vmb-help-content p {
                margin-bottom: 12px;
            }
            
            .vmb-help-content ul, .vmb-help-content ol {
                margin-left: 20px;
                margin-bottom: 16px;
            }
            
            .vmb-help-content li {
                margin-bottom: 8px;
            }
            
            .vmb-help-content code {
                background: #2a2a2a;
                padding: 2px 6px;
                border-radius: 3px;
                color: #ff6b6b;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 0.9em;
            }
            
            .vmb-help-content .vmb-help-note {
                background: rgba(102, 126, 234, 0.1);
                border-left: 4px solid #667eea;
                padding: 12px 16px;
                margin: 16px 0;
                border-radius: 4px;
            }
            
            .vmb-help-content .vmb-help-warning {
                background: rgba(255, 193, 7, 0.1);
                border-left: 4px solid #ffc107;
                padding: 12px 16px;
                margin: 16px 0;
                border-radius: 4px;
            }
            
            .vmb-help-content .vmb-help-tip {
                background: rgba(76, 175, 80, 0.1);
                border-left: 4px solid #4CAF50;
                padding: 12px 16px;
                margin: 16px 0;
                border-radius: 4px;
            }
            
            .vmb-help-shortcut {
                display: inline-block;
                background: #2a2a2a;
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid #3a3a3a;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 0.85em;
                color: #ffb86c;
                margin: 0 2px;
            }
        `;

    document.head.appendChild(style);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Documentation data
    const documentation = {
        'Getting Started': {
            icon: '🚀',
            topics: {
                'Introduction': `
                        <h3>Introduction to Visual Module Builder</h3>
                        <p>The Visual Module Builder is a powerful node-based visual programming interface that lets you create custom game modules without writing code. Think of it as a blueprint editor where you connect logic blocks to create behavior.</p>
                        
                        <h4>What are Visual Modules?</h4>
                        <p>Visual Modules are reusable game components that can be attached to GameObjects. They work just like regular code modules but are created visually by connecting nodes together.</p>
                        
                        <div class="vmb-help-tip">
                            <strong>💡 Tip:</strong> Visual modules are perfect for designers, artists, or anyone who wants to create game logic without diving into code!
                        </div>
                        
                        <h4>Key Benefits</h4>
                        <ul>
                            <li><strong>Visual Clarity:</strong> See your logic flow at a glance</li>
                            <li><strong>No Syntax Errors:</strong> Connections ensure valid logic</li>
                            <li><strong>Rapid Prototyping:</strong> Test ideas quickly</li>
                            <li><strong>Reusable:</strong> Export and use across projects</li>
                            <li><strong>Easy to Learn:</strong> Intuitive drag-and-drop interface</li>
                        </ul>
                    `,
                'Quick Start Guide': `
                        <h3>Quick Start Guide</h3>
                        <p>Get up and running with your first visual module in 5 simple steps:</p>
                        
                        <h4>Step 1: Name Your Module</h4>
                        <p>At the top of the window, set your module's name, namespace, and description. This information helps organize your modules.</p>
                        
                        <h4>Step 2: Add an Event Node</h4>
                        <p>Every module needs at least one event node to start execution. Drag a <code>Start</code> or <code>Loop</code> node from the Events category onto the canvas.</p>
                        
                        <h4>Step 3: Add Logic Nodes</h4>
                        <p>Browse the node library on the left and drag nodes onto the canvas. Nodes are organized by category (Variables, Logic, Math, etc.).</p>
                        
                        <h4>Step 4: Connect Nodes</h4>
                        <p>Click and drag from an output port (right side of a node) to an input port (left side of another node) to create connections. These connections define the flow of execution and data.</p>
                        
                        <h4>Step 5: Export Your Module</h4>
                        <p>Click the <strong>Export Module</strong> button to generate your module. It will be saved to the "Visual Modules" directory and automatically registered with the engine.</p>
                        
                        <div class="vmb-help-note">
                            <strong>📌 Note:</strong> Don't forget to save your project (<span class="vmb-help-shortcut">Ctrl+S</span>) so you can edit it later!
                        </div>
                    `,
                'Interface Overview': `
                        <h3>Interface Overview</h3>
                        
                        <h4>Top Toolbar</h4>
                        <ul>
                            <li><strong>Module Name:</strong> The name of your module class</li>
                            <li><strong>Namespace:</strong> Organizational category for your module</li>
                            <li><strong>Description:</strong> Brief explanation of what your module does</li>
                            <li><strong>Icon:</strong> Visual icon shown in the editor</li>
                            <li><strong>Color:</strong> Module's accent color</li>
                        </ul>
                        
                        <h4>Left Sidebar - Node Library</h4>
                        <p>Browse and select nodes organized by category. Click a category header to expand/collapse it. Drag nodes onto the canvas to use them.</p>
                        
                        <h4>Center Canvas</h4>
                        <p>Your main workspace where you arrange and connect nodes. Pan by dragging with the middle mouse button or left click on empty space. Zoom with the mouse wheel.</p>
                        
                        <h4>Bottom Toolbar</h4>
                        <p>Access project management functions:</p>
                        <ul>
                            <li><strong>New Project:</strong> Start a fresh module</li>
                            <li><strong>Save:</strong> Save your current work</li>
                            <li><strong>Load:</strong> Open an existing project</li>
                            <li><strong>Export:</strong> Generate the final module</li>
                            <li><strong>Clear:</strong> Reset the canvas</li>
                        </ul>
                    `
            }
        },
        'Working with Nodes': {
            icon: '🔷',
            topics: {
                'Understanding Nodes': `
                        <h3>Understanding Nodes</h3>
                        <p>Nodes are the building blocks of your visual module. Each node represents a specific operation or piece of data.</p>
                        
                        <h4>Node Anatomy</h4>
                        <ul>
                            <li><strong>Title Bar:</strong> Shows the node type and color-coding</li>
                            <li><strong>Input Ports (Left):</strong> Receive data or execution flow</li>
                            <li><strong>Output Ports (Right):</strong> Send data or execution flow</li>
                            <li><strong>Body:</strong> May contain editable values or displays</li>
                        </ul>
                        
                        <h4>Port Types</h4>
                        <p>Different colored ports indicate different data types:</p>
                        <ul>
                            <li><strong>White/Gray:</strong> Execution flow (determines order of operations)</li>
                            <li><strong>Blue:</strong> Numbers</li>
                            <li><strong>Green:</strong> Text/Strings</li>
                            <li><strong>Red:</strong> Booleans (true/false)</li>
                            <li><strong>Purple:</strong> Objects/References</li>
                        </ul>
                        
                        <div class="vmb-help-warning">
                            <strong>⚠️ Important:</strong> You can only connect ports of compatible types. The system prevents invalid connections.
                        </div>
                    `,
                'Adding Nodes': `
                        <h3>Adding Nodes to the Canvas</h3>
                        
                        <h4>Method 1: Drag and Drop</h4>
                        <ol>
                            <li>Expand a category in the left sidebar</li>
                            <li>Click and hold on a node type</li>
                            <li>Drag it onto the canvas</li>
                            <li>Release to place it</li>
                        </ol>
                        
                        <h4>Node Placement Tips</h4>
                        <ul>
                            <li>Arrange nodes left-to-right following execution flow</li>
                            <li>Keep related nodes grouped together</li>
                            <li>Leave space for connections to be visible</li>
                            <li>Use Group nodes to organize complex logic</li>
                        </ul>
                        
                        <div class="vmb-help-tip">
                            <strong>💡 Tip:</strong> Event nodes (Start, Loop, Draw) are usually placed on the far left as they're the entry points for execution.
                        </div>
                    `,
                'Connecting Nodes': `
                        <h3>Connecting Nodes</h3>
                        <p>Connections define how data flows and in what order operations execute.</p>
                        
                        <h4>Creating Connections</h4>
                        <ol>
                            <li>Click on an output port (right side of a node)</li>
                            <li>Drag to an input port (left side of another node)</li>
                            <li>Release when the target port is highlighted</li>
                        </ol>
                        
                        <h4>Execution Flow vs Data Flow</h4>
                        <p><strong>Execution Flow (White):</strong> Determines what happens and when. Follow these connections to see the order of operations.</p>
                        <p><strong>Data Flow (Colored):</strong> Passes values between nodes. A node receives all its input data before executing.</p>
                        
                        <h4>Removing Connections</h4>
                        <ul>
                            <li>Click on the starting or ending point of a connection</li>
                            <li>The connection will be removed</li>
                            <li>Or delete the entire node to remove all its connections</li>
                        </ul>
                        
                        <div class="vmb-help-note">
                            <strong>📌 Note:</strong> An input port can only have one incoming connection, but an output port can connect to multiple inputs.
                        </div>
                    `,
                'Moving and Selecting': `
                        <h3>Moving and Selecting Nodes</h3>
                        
                        <h4>Selecting Nodes</h4>
                        <ul>
                            <li>Click on a node to select it (highlighted border)</li>
                            <li>Only one node can be selected at a time</li>
                            <li>Selected node can be deleted with <span class="vmb-help-shortcut">Delete</span> key</li>
                        </ul>
                        
                        <h4>Moving Nodes</h4>
                        <ul>
                            <li>Click and drag a node's title bar or body</li>
                            <li>Move it to a new position on the canvas</li>
                            <li>Connections automatically update to follow</li>
                        </ul>
                        
                        <h4>Canvas Navigation</h4>
                        <ul>
                            <li><strong>Pan:</strong> Middle mouse button + drag, or left click + drag on empty space</li>
                            <li><strong>Zoom:</strong> Mouse wheel up/down</li>
                            <li><strong>Reset View:</strong> Adjust zoom/pan to see all nodes</li>
                        </ul>
                    `,
                'Editing Values': `
                        <h3>Editing Node Values</h3>
                        <p>Some nodes have editable values that you can customize.</p>
                        
                        <h4>Text and Number Fields</h4>
                        <ul>
                            <li>Double-click on a node with editable values</li>
                            <li>A text input will appear</li>
                            <li>Type your value and press <span class="vmb-help-shortcut">Enter</span></li>
                            <li>Press <span class="vmb-help-shortcut">Esc</span> to cancel editing</li>
                        </ul>
                        
                        <h4>Common Editable Nodes</h4>
                        <ul>
                            <li><strong>Number:</strong> Constant number values</li>
                            <li><strong>String:</strong> Text values</li>
                            <li><strong>Get Variable:</strong> Property names</li>
                            <li><strong>Set Variable:</strong> Property names</li>
                        </ul>
                    `
            }
        },
        'Node Categories': {
            icon: '📚',
            topics: {
                'Event Nodes': `
                        <h3>Event Nodes</h3>
                        <p>Event nodes are entry points where your module's code begins execution. Every visual module needs at least one event node.</p>
                        
                        <h4>Available Events</h4>
                        
                        <p><strong>Start</strong> - Runs once when the module is first created</p>
                        <ul>
                            <li>Perfect for initialization</li>
                            <li>Set up initial values</li>
                            <li>Configure starting state</li>
                            <li>Example: Setting starting position, health, or loading resources</li>
                        </ul>
                        
                        <p><strong>Loop</strong> - Runs every frame</p>
                        <ul>
                            <li>Continuous logic and updates</li>
                            <li>Movement, animations, checking conditions</li>
                            <li>Receives <code>dt</code> (delta time) for frame-independent movement</li>
                            <li>Example: Moving a character, rotating an object</li>
                        </ul>
                        
                        <p><strong>Draw</strong> - Runs every frame for rendering</p>
                        <ul>
                            <li>Custom drawing and visual effects</li>
                            <li>Receives <code>ctx</code> (canvas context) for drawing</li>
                            <li>Draw shapes, text, images</li>
                            <li>Example: Health bars, debug visuals, custom effects</li>
                        </ul>
                        
                        <p><strong>OnDestroy</strong> - Runs when the module is removed</p>
                        <ul>
                            <li>Cleanup operations</li>
                            <li>Remove event listeners</li>
                            <li>Save state before destruction</li>
                            <li>Example: Spawn particles on death, save score</li>
                        </ul>
                        
                        <div class="vmb-help-tip">
                            <strong>💡 Tip:</strong> You can have multiple event nodes of the same type. Each will execute independently when the event occurs.
                        </div>
                    `,
                'Variable Nodes': `
                        <h3>Variable Nodes</h3>
                        <p>Variables store and retrieve data in your module. They're essential for maintaining state and passing information between nodes.</p>
                        
                        <h4>Get Variable</h4>
                        <p>Retrieves the value of a module property.</p>
                        <ul>
                            <li>Double-click to set the property name</li>
                            <li>Outputs the current value</li>
                            <li>Example: Get <code>this.health</code> or <code>this.speed</code></li>
                        </ul>
                        
                        <h4>Set Variable</h4>
                        <p>Sets the value of a module property.</p>
                        <ul>
                            <li>Double-click to set the property name</li>
                            <li>Receives a value input</li>
                            <li>Updates <code>this.propertyName</code></li>
                            <li>Example: Set <code>this.score = 100</code></li>
                        </ul>
                        
                        <h4>Number / String / Boolean</h4>
                        <p>Constant values that don't change.</p>
                        <ul>
                            <li>Double-click to edit the value</li>
                            <li>Use as inputs to other nodes</li>
                            <li>Example: Speed value of 5, name "Player", enabled = true</li>
                        </ul>
                        
                        <div class="vmb-help-note">
                            <strong>📌 Note:</strong> Variables you create with Get/Set are automatically added to your module's <code>this</code> context.
                        </div>
                    `,
                'Logic Nodes': `
                        <h3>Logic Nodes</h3>
                        <p>Logic nodes control the flow of execution based on conditions.</p>
                        
                        <h4>If Statement</h4>
                        <p>Branches execution based on a true/false condition.</p>
                        <ul>
                            <li><strong>Condition input:</strong> Boolean value to check</li>
                            <li><strong>True output:</strong> Executes if condition is true</li>
                            <li><strong>False output:</strong> Executes if condition is false</li>
                        </ul>
                        
                        <h4>Comparison Nodes</h4>
                        <ul>
                            <li><strong>Equals (==):</strong> Checks if two values are equal</li>
                            <li><strong>Greater Than (>):</strong> Checks if A is greater than B</li>
                            <li><strong>Less Than (<):</strong> Checks if A is less than B</li>
                        </ul>
                        
                        <h4>Boolean Logic</h4>
                        <ul>
                            <li><strong>AND:</strong> True if both inputs are true</li>
                            <li><strong>OR:</strong> True if at least one input is true</li>
                            <li><strong>NOT:</strong> Inverts true to false and vice versa</li>
                        </ul>
                        
                        <div class="vmb-help-tip">
                            <strong>💡 Tip:</strong> Chain comparison and boolean nodes together to create complex conditions like "if health > 0 AND ammo > 0".
                        </div>
                    `,
                'Math Nodes': `
                        <h3>Math Nodes</h3>
                        <p>Perform mathematical operations on numbers.</p>
                        
                        <h4>Basic Operations</h4>
                        <ul>
                            <li><strong>Add (+):</strong> Adds two numbers together</li>
                            <li><strong>Subtract (-):</strong> Subtracts B from A</li>
                            <li><strong>Multiply (*):</strong> Multiplies two numbers</li>
                            <li><strong>Divide (/):</strong> Divides A by B</li>
                        </ul>
                        
                        <h4>Common Uses</h4>
                        <ul>
                            <li>Calculate distances and positions</li>
                            <li>Adjust speeds and velocities</li>
                            <li>Track scores and counters</li>
                            <li>Scale values and sizes</li>
                        </ul>
                        
                        <div class="vmb-help-note">
                            <strong>📌 Note:</strong> Math nodes output numbers that can be passed to other nodes or stored in variables.
                        </div>
                    `,
                'GameObject Nodes': `
                        <h3>GameObject Nodes</h3>
                        <p>Interact with GameObjects in your scene.</p>
                        
                        <h4>Get Position</h4>
                        <p>Retrieves the X and Y coordinates of this GameObject.</p>
                        <ul>
                            <li>Outputs <code>this.x</code> and <code>this.y</code></li>
                            <li>Use for positioning logic</li>
                        </ul>
                        
                        <h4>Set Position</h4>
                        <p>Moves this GameObject to new coordinates.</p>
                        <ul>
                            <li>Inputs: X and Y values</li>
                            <li>Updates <code>this.x</code> and <code>this.y</code></li>
                        </ul>
                        
                        <h4>Find GameObject</h4>
                        <p>Searches for other objects in the scene.</p>
                        <ul>
                            <li>Input: Object name or tag to search for</li>
                            <li>Output: Reference to the found object</li>
                            <li>Returns null if not found</li>
                        </ul>
                        
                        <h4>Instantiate</h4>
                        <p>Creates a new GameObject in the scene.</p>
                        <ul>
                            <li>Spawns objects dynamically</li>
                            <li>Perfect for bullets, enemies, pickups</li>
                        </ul>
                    `,
                'Drawing Nodes': `
                        <h3>Drawing Nodes</h3>
                        <p>Render custom visuals using canvas drawing commands. Use these inside a Draw event node.</p>
                        
                        <h4>Draw Rectangle</h4>
                        <p>Draws a filled rectangle.</p>
                        <ul>
                            <li>Inputs: X, Y, Width, Height, Color</li>
                            <li>Example: Health bars, UI elements</li>
                        </ul>
                        
                        <h4>Draw Circle</h4>
                        <p>Draws a filled circle.</p>
                        <ul>
                            <li>Inputs: X, Y, Radius, Color</li>
                            <li>Example: Radar blips, selection indicators</li>
                        </ul>
                        
                        <h4>Draw Text</h4>
                        <p>Renders text on the canvas.</p>
                        <ul>
                            <li>Inputs: Text, X, Y, Font, Color</li>
                            <li>Example: Score displays, labels, dialogue</li>
                        </ul>
                        
                        <div class="vmb-help-warning">
                            <strong>⚠️ Important:</strong> Drawing nodes only work inside a Draw event. They won't do anything in Start or Loop events.
                        </div>
                    `,
                    'Input Nodes': `
                        <h3>Input Nodes</h3>
                        <p>Access player input from keyboard, mouse, and touch devices.</p>
                        
                        <h4>Key Down</h4>
                        <p>Checks if a specific key is currently pressed.</p>
                        <ul>
                            <li>Input: Key name (string, e.g., "w", "Space", "ArrowUp")</li>
                            <li>Output: Boolean (true if key is down)</li>
                            <li>Example: Move character while "w" is held</li>
                        </ul>
                        
                        <h4>Key Pressed</h4>
                        <p>Detects the moment a key is pressed (one-time trigger).</p>
                        <ul>
                            <li>Input: Key name</li>
                            <li>Output: Boolean (true on the frame the key was pressed)</li>
                            <li>Example: Jump when spacebar is pressed</li>
                        </ul>
                        
                        <h4>Mouse Position</h4>
                        <p>Gets the current mouse cursor position in the game world.</p>
                        <ul>
                            <li>Outputs: X and Y coordinates</li>
                            <li>Coordinates are in world space</li>
                            <li>Example: Aim at mouse position, follow cursor</li>
                        </ul>
                        
                        <h4>Mouse Button</h4>
                        <p>Checks if a mouse button is pressed.</p>
                        <ul>
                            <li>Input: Button number (0=left, 1=middle, 2=right)</li>
                            <li>Output: Boolean</li>
                            <li>Example: Shoot on left click</li>
                        </ul>
                        
                        <div class="vmb-help-tip">
                            <strong>💡 Tip:</strong> Combine key inputs with If nodes to create responsive controls!
                        </div>
                    `,
            }
        },
            'MelodiCode Audio': {
                icon: '🎵',
                topics: {
                    'Introduction to MelodiCode': `
                        <h3>Introduction to MelodiCode</h3>
                        <p>MelodiCode is a code-based music generation system integrated into the Visual Module Builder. Create dynamic music, sound effects, and audio that responds to gameplay using a powerful script-based approach.</p>
                        
                        <h4>What is MelodiCode?</h4>
                        <p>MelodiCode allows you to generate audio programmatically by building scripts that describe musical patterns, melodies, drum beats, and effects. Instead of pre-recorded audio files, you create music through code that can be dynamic and responsive.</p>
                        
                        <h4>Key Features</h4>
                        <ul>
                            <li><strong>Real-time Generation:</strong> Create music on-the-fly</li>
                            <li><strong>Procedural Audio:</strong> Generate unique sounds each time</li>
                            <li><strong>Block-Based Structure:</strong> Organize music into reusable blocks</li>
                            <li><strong>Built-in Samples:</strong> Extensive drum and synth library</li>
                            <li><strong>Visual Scripting:</strong> Build MelodiCode scripts with nodes</li>
                        </ul>
                        
                        <h4>How It Works</h4>
                        <p>You build a MelodiCode script using Script Builder nodes, then play it with the Play MelodiCode node. Scripts define blocks of music that can be played, looped, and combined.</p>
                        
                        <div class="vmb-help-tip">
                            <strong>💡 Tip:</strong> Check out the MelodiCode Audio example module to see a complete working example!
                        </div>
                    `,
                    'Script Builder Basics': `
                        <h3>Script Builder Basics</h3>
                        <p>The Script Builder nodes let you construct MelodiCode scripts visually by chaining nodes together.</p>
                        
                        <h4>How Script Building Works</h4>
                        <p>Script Builder nodes use a special "scriptFlow" connection type that passes the accumulated script from node to node. Each node adds its command to the script string.</p>
                        
                        <h4>Basic Workflow</h4>
                        <ol>
                            <li><strong>Set BPM:</strong> Start by setting the tempo</li>
                            <li><strong>Create Blocks:</strong> Define named sections of music</li>
                            <li><strong>Add Commands:</strong> Add tones, samples, waits, slides</li>
                            <li><strong>End Blocks:</strong> Close each block</li>
                            <li><strong>Add Play Command:</strong> Tell which blocks to play</li>
                            <li><strong>Execute:</strong> Connect to Play MelodiCode node</li>
                        </ol>
                        
                        <h4>Script Flow Connection</h4>
                        <p>The purple "scriptFlow" connections are special - they carry the entire script being built. Always connect them in sequence from top to bottom.</p>
                        
                        <div class="vmb-help-note">
                            <strong>📌 Note:</strong> Script Builder nodes must be connected in the order you want commands to appear in the final script.
                        </div>
                    `,
                    'Blocks and Structure': `
                        <h3>Blocks and Structure</h3>
                        <p>MelodiCode uses blocks to organize music into reusable sections.</p>
                        
                        <h4>What are Blocks?</h4>
                        <p>Blocks are named containers that hold a sequence of musical commands. Think of them like functions in programming - they group related actions together.</p>
                        
                        <h4>Complete Block Node</h4>
                        <p>Creates a full block with start, content, and end.</p>
                        <ul>
                            <li><strong>Inputs:</strong> scriptFlow, blockName, effects, content</li>
                            <li>Automatically wraps content in <code>[blockName] ... [end]</code></li>
                            <li>Can include effects like reverb or delay</li>
                        </ul>
                        
                        <h4>The [main] Block</h4>
                        <p>The <code>main</code> block is special - it's typically your entry point where you orchestrate other blocks.</p>
                        
                        <h4>Example Structure</h4>
                        <p>Typical MelodiCode script structure:</p>
                        <pre><code>bpm 120
        [melody]
            tone C4 0.5
            tone E4 0.5
        [end]

        [drums]
            sample kick
            wait 0.5
        [end]

        [main]
            play melody drums
        [end]

        play main</code></pre>
                        
                        <h4>Sample Blocks</h4>
                        <p>Complete Sample Block nodes create custom sounds where all tones play simultaneously.</p>
                        <ul>
                            <li>Use angle brackets <code>&lt;name&gt; ... &lt;end&gt;</code></li>
                            <li>All commands inside play at once (layered)</li>
                            <li>Perfect for custom drum sounds or synth patches</li>
                        </ul>
                    `,
                    'Musical Commands': `
                        <h3>Musical Commands</h3>
                        <p>These nodes add musical elements to your script.</p>
                        
                        <h4>Add Tone</h4>
                        <p>Generates a musical note or tone.</p>
                        <ul>
                            <li><strong>Inputs:</strong> note (e.g., C4), duration, waveType, volume, pan</li>
                            <li><strong>Wave Types:</strong> sine, square, sawtooth, triangle</li>
                            <li>Creates sustained tones for melodies</li>
                            <li>Example: <code>tone C4 0.5 sine 0.8 0</code></li>
                        </ul>
                        
                        <h4>Add Sample</h4>
                        <p>Plays a built-in or custom sample.</p>
                        <ul>
                            <li><strong>Inputs:</strong> sample name, pitch, timescale, volume, pan</li>
                            <li><strong>Built-in samples:</strong> kick, snare, hihat, bass_low, lead_1, etc.</li>
                            <li>Pitch: 1=normal, 2=double speed/higher pitch</li>
                            <li>Example: <code>sample kick 1 1 0.8 0</code></li>
                        </ul>
                        
                        <h4>Add Slide</h4>
                        <p>Creates a pitch-sliding tone from one note to another.</p>
                        <ul>
                            <li><strong>Inputs:</strong> startNote, endNote, duration, waveType, volume, pan</li>
                            <li>Great for swooshes, sirens, bass drops</li>
                            <li>Example: <code>slide G4 C5 1 sawtooth 0.8 0</code></li>
                        </ul>
                        
                        <h4>Add Wait</h4>
                        <p>Adds a pause/rest in the music.</p>
                        <ul>
                            <li><strong>Input:</strong> duration (in seconds)</li>
                            <li>Creates timing between notes</li>
                            <li>Example: <code>wait 0.5</code> for half-second pause</li>
                        </ul>
                        
                        <div class="vmb-help-tip">
                            <strong>💡 Tip:</strong> Use the Note Selector node to easily choose musical notes without typing!
                        </div>
                    `,
                    'Control Commands': `
                        <h3>Control Commands</h3>
                        <p>These nodes control playback and structure.</p>
                        
                        <h4>Set BPM</h4>
                        <p>Sets the tempo (beats per minute) for the entire script.</p>
                        <ul>
                            <li><strong>Input:</strong> BPM value (e.g., 120)</li>
                            <li>Typically the first command in your script</li>
                            <li>Affects timing of all musical elements</li>
                            <li>Example: <code>bpm 140</code> for faster tempo</li>
                        </ul>
                        
                        <h4>Add Play</h4>
                        <p>Tells MelodiCode which blocks to play simultaneously.</p>
                        <ul>
                            <li><strong>Input:</strong> Block name(s) to play</li>
                            <li>Can play multiple blocks at once (separated by spaces)</li>
                            <li>Example: <code>play melody drums bass</code></li>
                        </ul>
                        
                        <h4>Add Loop</h4>
                        <p>Repeats a block multiple times.</p>
                        <ul>
                            <li><strong>Inputs:</strong> count (number of repeats), block name(s)</li>
                            <li>Useful for drum patterns and repetitive sections</li>
                            <li>Can loop multiple blocks together</li>
                            <li>Example: <code>loop 4 drums</code></li>
                        </ul>
                        
                        <h4>Add Sidechain</h4>
                        <p>Creates a ducking effect where one block affects another's volume.</p>
                        <ul>
                            <li><strong>Inputs:</strong> block1 (trigger), block2 (affected), amount</li>
                            <li>Classic EDM pumping effect</li>
                            <li>Example: Kick drum ducks the bass</li>
                        </ul>
                        
                        <h4>Add TTS (Text-to-Speech)</h4>
                        <p>Adds spoken text to your music.</p>
                        <ul>
                            <li><strong>Inputs:</strong> text, speed, pitch, voice</li>
                            <li>Note: TTS does NOT export to WAV</li>
                            <li>Great for game announcements or lyrics</li>
                        </ul>
                    `,
                    'Playback Nodes': `
                        <h3>Playback Nodes</h3>
                        <p>Execute and control MelodiCode scripts.</p>
                        
                        <h4>Play MelodiCode</h4>
                        <p>Executes a MelodiCode script you've built.</p>
                        <ul>
                            <li><strong>Inputs:</strong> Execution flow, script code, BPM (optional)</li>
                            <li>Connects to the end of your Script Builder chain</li>
                            <li>Starts audio playback immediately</li>
                            <li>Use in Start event for music that plays on load</li>
                        </ul>
                        
                        <h4>Stop MelodiCode</h4>
                        <p>Stops the currently playing MelodiCode audio.</p>
                        <ul>
                            <li>Immediately halts all audio</li>
                            <li>Use when switching scenes or game states</li>
                        </ul>
                        
                        <h4>Is Playing</h4>
                        <p>Checks if MelodiCode is currently playing.</p>
                        <ul>
                            <li>Output: Boolean (true if playing)</li>
                            <li>Useful for conditional logic</li>
                            <li>Example: Don't start new music if already playing</li>
                        </ul>
                        
                        <div class="vmb-help-note">
                            <strong>📌 Note:</strong> Only one MelodiCode script can play at a time. Starting a new script stops the previous one.
                        </div>
                    `,
                    'Helper Nodes': `
                        <h3>Helper Nodes</h3>
                        <p>Utility nodes to make building easier.</p>
                        
                        <h4>Note Selector</h4>
                        <p>Visual note picker with dropdown.</p>
                        <ul>
                            <li>Dropdown with all musical notes from C0 to C8</li>
                            <li>Includes sharps (C#, D#, etc.)</li>
                            <li>Outputs note as string (e.g., "C4")</li>
                            <li>Much easier than typing note names!</li>
                        </ul>
                        
                        <h4>Sample Selector</h4>
                        <p>Dropdown list of all built-in samples.</p>
                        <ul>
                            <li><strong>Drums:</strong> kick, snare, hihat, crash, tom_high, etc.</li>
                            <li><strong>Bass:</strong> bass_low, bass_mid, sub_bass, bass_pluck</li>
                            <li><strong>Leads:</strong> lead_1, lead_2, lead_bright, lead_soft</li>
                            <li><strong>Pads:</strong> pad_1, pad_warm, pad_strings, pad_choir</li>
                            <li><strong>Percussion:</strong> shaker, tambourine, cowbell, woodblock</li>
                            <li><strong>FX:</strong> whoosh, zap, drop, rise</li>
                        </ul>
                        
                        <h4>Wave Type Selector</h4>
                        <p>Choose synthesizer waveform.</p>
                        <ul>
                            <li><strong>sine:</strong> Smooth, pure tone (good for bass, subs)</li>
                            <li><strong>square:</strong> Hollow, retro game sound</li>
                            <li><strong>sawtooth:</strong> Bright, buzzy (good for leads)</li>
                            <li><strong>triangle:</strong> Mellow, flute-like</li>
                        </ul>
                        
                        <h4>Effect String</h4>
                        <p>Creates effect parameters for blocks.</p>
                        <ul>
                            <li>Dropdown: reverb, delay, filter, distortion, chorus</li>
                            <li>Input: Effect parameters</li>
                            <li>Output: Formatted effect string</li>
                            <li>Example: <code>(reverb 0.3)</code></li>
                        </ul>
                        
                        <h4>Get Available Samples</h4>
                        <p>Returns array of all sample names.</p>
                        <ul>
                            <li>Useful for dynamic sample selection</li>
                            <li>Can be used with random selection</li>
                        </ul>
                        
                        <h4>Set Master Volume</h4>
                        <p>Adjusts the overall MelodiCode volume.</p>
                        <ul>
                            <li>Input: Volume (0-1)</li>
                            <li>Affects all MelodiCode audio</li>
                        </ul>
                    `,
                    'Quick Playback Methods': `
                        <h3>Quick Playback Methods</h3>
                        <p>Simplified nodes for quick audio without building full scripts.</p>
                        
                        <h4>Play Beat</h4>
                        <p>Quickly play a drum pattern.</p>
                        <ul>
                            <li><strong>Inputs:</strong> Pattern string, BPM</li>
                            <li>Simple way to add drums</li>
                            <li>Example: <code>"x--x--x-"</code> for kick pattern</li>
                        </ul>
                        
                        <h4>Play Melody</h4>
                        <p>Play a sequence of notes.</p>
                        <ul>
                            <li><strong>Inputs:</strong> Note array, duration, BPM</li>
                            <li>Quick melodies without building blocks</li>
                            <li>Example: <code>["C4", "E4", "G4"]</code></li>
                        </ul>
                        
                        <h4>Play Sample</h4>
                        <p>Play a single sample immediately.</p>
                        <ul>
                            <li><strong>Inputs:</strong> Sample name, pitch, timescale, volume, pan</li>
                            <li>Great for one-shot sound effects</li>
                            <li>Example: Play kick drum on collision</li>
                        </ul>
                        
                        <h4>Play Tone</h4>
                        <p>Play a single tone immediately.</p>
                        <ul>
                            <li><strong>Inputs:</strong> Frequency/note, duration, waveType, volume, pan, BPM</li>
                            <li>Simple beeps and alerts</li>
                            <li>Example: Play C4 for 1 second</li>
                        </ul>
                        
                        <div class="vmb-help-tip">
                            <strong>💡 Tip:</strong> Use these quick methods for UI sounds and simple effects. Use Script Builder for complex music!
                        </div>
                    `,
                    'Complete Example': `
                        <h3>Complete MelodiCode Example</h3>
                        <p>Here's how to build a complete musical piece step by step.</p>
                        
                        <h4>The Goal</h4>
                        <p>Create a song with a melody and drum beat that loops 4 times.</p>
                        
                        <h4>Node Setup</h4>
                        <ol>
                            <li><strong>Start Event</strong> - Triggers when module loads</li>
                            <li><strong>Number (120)</strong> → <strong>Set BPM</strong> - Set tempo to 120 BPM</li>
                            <li><strong>String ("melody")</strong> → <strong>Start Block</strong> - Begin melody block</li>
                            <li><strong>Note Selector (C4)</strong> + <strong>Number (0.5)</strong> → <strong>Add Tone</strong></li>
                            <li><strong>Number (0.25)</strong> → <strong>Add Wait</strong></li>
                            <li><strong>Note Selector (E4)</strong> + <strong>Number (0.5)</strong> → <strong>Add Tone</strong></li>
                            <li><strong>Number (0.25)</strong> → <strong>Add Wait</strong></li>
                            <li><strong>Note Selector (G4)</strong> + <strong>Number (0.5)</strong> → <strong>Add Tone</strong></li>
                            <li><strong>End Block</strong> - Close melody block</li>
                            <li><strong>String ("drums")</strong> → <strong>Start Block</strong> - Begin drums block</li>
                            <li><strong>Sample Selector (kick)</strong> → <strong>Add Sample</strong></li>
                            <li><strong>Number (0.5)</strong> → <strong>Add Wait</strong></li>
                            <li><strong>Sample Selector (snare)</strong> → <strong>Add Sample</strong></li>
                            <li><strong>Number (0.5)</strong> → <strong>Add Wait</strong></li>
                            <li><strong>End Block</strong> - Close drums block</li>
                            <li><strong>Number (4)</strong> + <strong>String ("drums")</strong> → <strong>Add Loop</strong></li>
                            <li><strong>String ("melody")</strong> → <strong>Add Play</strong></li>
                            <li><strong>Play MelodiCode</strong> - Execute the script</li>
                        </ol>
                        
                        <h4>Connection Pattern</h4>
                        <p>All Script Builder nodes connect via <code>scriptFlow</code> ports (purple). The final <code>scriptFlow</code> output connects to the <code>code</code> input of Play MelodiCode.</p>
                        
                        <h4>Generated Script</h4>
                        <pre><code>bpm 120
        [melody]
        tone C4 0.5 sine 0.8 0
        wait 0.25
        tone E4 0.5 sine 0.8 0
        wait 0.25
        tone G4 0.5 sine 0.8 0
        [end]
        [drums]
        sample kick 1 1 0.8 0
        wait 0.5
        sample snare 1 1 0.8 0
        wait 0.5
        [end]
        loop 4 drums
        play melody

        play melody</code></pre>
                        
                        <div class="vmb-help-tip">
                            <strong>💡 Tip:</strong> Load the "MelodiCode Audio" example module from the Examples menu to see this in action!
                        </div>
                    `
                }
            },
        'Advanced Features': {
            icon: '⚙️',
            topics: {
                'Group Nodes': `
                        <h3>Group Nodes</h3>
                        <p>Groups let you organize complex logic into reusable containers, similar to functions in code.</p>
                        
                        <h4>Creating Groups</h4>
                        <ol>
                            <li>Add a Group node from the Utilities category</li>
                            <li>Double-click the group to "enter" it</li>
                            <li>Build your logic inside the group</li>
                            <li>Use "Exit Group" button to return to main canvas</li>
                        </ol>
                        
                        <h4>Benefits of Groups</h4>
                        <ul>
                            <li><strong>Organization:</strong> Hide complexity behind a single node</li>
                            <li><strong>Reusability:</strong> Use the same logic in multiple places</li>
                            <li><strong>Readability:</strong> Keep your main canvas clean</li>
                            <li><strong>Debugging:</strong> Isolate and test specific functionality</li>
                        </ul>
                        
                        <div class="vmb-help-tip">
                            <strong>💡 Tip:</strong> Think of groups like functions - they take inputs, do something, and produce outputs.
                        </div>
                    `,
                'Module References': `
                        <h3>Module References</h3>
                        <p>Reference and use properties/methods from existing modules in the engine.</p>
                        
                        <h4>Referencing Modules</h4>
                        <ul>
                            <li>Use nodes from the "Modules" category</li>
                            <li>Access properties and methods from registered modules</li>
                            <li>Call functions from other modules</li>
                            <li>Build on top of existing functionality</li>
                        </ul>
                        
                        <h4>Available Module Nodes</h4>
                        <p>The node library dynamically shows all available modules and their public members. Look for nodes labeled with module names.</p>
                        
                        <div class="vmb-help-note">
                            <strong>📌 Note:</strong> Only public properties and methods (those not starting with _) are available for referencing.
                        </div>
                    `,
                'Saving and Loading': `
                        <h3>Saving and Loading Projects</h3>
                        <p>Save your work to edit later or share with others.</p>
                        
                        <h4>Saving Projects</h4>
                        <ul>
                            <li>Click <strong>Save Project</strong> or press <span class="vmb-help-shortcut">Ctrl+S</span></li>
                            <li>Enter a filename (without extension)</li>
                            <li>Projects are saved as <code>.vmb</code> files</li>
                            <li>Location: <code>Visual Module Builder Proj/</code> directory</li>
                        </ul>
                        
                        <h4>Loading Projects</h4>
                        <ul>
                            <li>Click <strong>Load Project</strong></li>
                            <li>Select from your saved projects</li>
                            <li>All nodes, connections, and settings are restored</li>
                        </ul>
                        
                        <div class="vmb-help-warning">
                            <strong>⚠️ Important:</strong> Save regularly! The system will warn you about unsaved changes when closing.
                        </div>
                    `,
                'Exporting Modules': `
                        <h3>Exporting Modules</h3>
                        <p>Convert your visual module into working code that can be used in the engine.</p>
                        
                        <h4>Export Process</h4>
                        <ol>
                            <li>Ensure your module has a valid name and namespace</li>
                            <li>Click <strong>Export Module</strong> button</li>
                            <li>The system generates JavaScript code</li>
                            <li>Module is saved to <code>Visual Modules/</code> directory</li>
                            <li>Module is automatically registered with the engine</li>
                        </ol>
                        
                        <h4>Using Exported Modules</h4>
                        <ul>
                            <li>Your module appears in the module list</li>
                            <li>Attach it to GameObjects like any other module</li>
                            <li>It functions identically to hand-coded modules</li>
                            <li>Can be referenced by other visual modules</li>
                        </ul>
                        
                        <h4>Module Settings</h4>
                        <ul>
                            <li><strong>Allow Multiple:</strong> Can multiple instances be on one GameObject?</li>
                            <li><strong>Draw in Editor:</strong> Should the module's draw method run in edit mode?</li>
                        </ul>
                    `
            }
        },
        'Tips & Best Practices': {
            icon: '💡',
            topics: {
                'Organization Tips': `
                        <h3>Organization Tips</h3>
                        <p>Keep your visual modules clean and maintainable.</p>
                        
                        <h4>Node Arrangement</h4>
                        <ul>
                            <li>Arrange nodes left-to-right following execution flow</li>
                            <li>Keep event nodes on the far left</li>
                            <li>Group related functionality together vertically</li>
                            <li>Leave adequate spacing for readability</li>
                        </ul>
                        
                        <h4>Connection Management</h4>
                        <ul>
                            <li>Minimize crossing connections when possible</li>
                            <li>Use consistent spacing between connected nodes</li>
                            <li>Consider using Groups for complex multi-step logic</li>
                        </ul>
                        
                        <h4>Naming Conventions</h4>
                        <ul>
                            <li>Use descriptive module names (PlayerController, not Module1)</li>
                            <li>Choose clear variable names (health, not h)</li>
                            <li>Add descriptions that explain what your module does</li>
                        </ul>
                    `,
                'Performance Tips': `
                        <h3>Performance Tips</h3>
                        <p>Create efficient visual modules that run smoothly.</p>
                        
                        <h4>Loop Event Optimization</h4>
                        <ul>
                            <li>Loop events run every frame - keep them lightweight</li>
                            <li>Avoid expensive operations in loops</li>
                            <li>Cache values instead of recalculating every frame</li>
                            <li>Use Start event for one-time initialization</li>
                        </ul>
                        
                        <h4>Draw Event Optimization</h4>
                        <ul>
                            <li>Only draw what's visible on screen</li>
                            <li>Keep draw calls to a minimum</li>
                            <li>Combine multiple rectangles into fewer draw calls</li>
                            <li>Consider using sprites instead of drawing shapes</li>
                        </ul>
                        
                        <div class="vmb-help-tip">
                            <strong>💡 Tip:</strong> If you have heavy calculations, consider doing them less frequently or spreading them across multiple frames.
                        </div>
                    `,
                'Common Patterns': `
                        <h3>Common Patterns</h3>
                        <p>Learn typical node configurations for common tasks.</p>
                        
                        <h4>Movement Pattern</h4>
                        <p>Loop → Get Position → Math (Add speed) → Set Position</p>
                        <ul>
                            <li>Runs every frame</li>
                            <li>Gets current position</li>
                            <li>Adds movement speed</li>
                            <li>Updates position</li>
                        </ul>
                        
                        <h4>Conditional Action Pattern</h4>
                        <p>Loop → Get Variable → Compare → If → Action</p>
                        <ul>
                            <li>Check a condition every frame</li>
                            <li>Compare against a value</li>
                            <li>Execute action only when true</li>
                        </ul>
                        
                        <h4>Timer Pattern</h4>
                        <p>Start → Set Variable (0) | Loop → Get Variable → Add → Set Variable → Compare → If</p>
                        <ul>
                            <li>Initialize counter in Start</li>
                            <li>Increment each frame in Loop</li>
                            <li>Check if time is up</li>
                            <li>Execute timed action</li>
                        </ul>
                        
                        <h4>Health Bar Pattern</h4>
                        <p>Draw → Get Variable (health) → Draw Rectangle (width based on health)</p>
                        <ul>
                            <li>Run in Draw event</li>
                            <li>Get current health value</li>
                            <li>Scale rectangle width proportionally</li>
                        </ul>
                    `,
                'Debugging Tips': `
                        <h3>Debugging Tips</h3>
                        <p>Troubleshoot issues in your visual modules.</p>
                        
                        <h4>Visual Debugging</h4>
                        <ul>
                            <li>Use Draw Text nodes to display variable values</li>
                            <li>Draw circles/rectangles to visualize positions</li>
                            <li>Check that execution flow connections are correct</li>
                            <li>Verify all data connections are the right type</li>
                        </ul>
                        
                        <h4>Common Issues</h4>
                        <ul>
                            <li><strong>Nothing happens:</strong> Check that event nodes are connected</li>
                            <li><strong>Unexpected values:</strong> Verify data flow connections</li>
                            <li><strong>Errors on export:</strong> Ensure all nodes have required inputs</li>
                            <li><strong>Module not appearing:</strong> Check namespace and reload module list</li>
                        </ul>
                        
                        <div class="vmb-help-tip">
                            <strong>💡 Tip:</strong> Start simple and test frequently. Add complexity gradually and verify each addition works before moving on.
                        </div>
                    `,
                'Keyboard Shortcuts': `
                        <h3>Keyboard Shortcuts</h3>
                        <p>Work faster with these keyboard shortcuts.</p>
                        
                        <h4>General</h4>
                        <ul>
                            <li><span class="vmb-help-shortcut">Ctrl+S</span> - Save project</li>
                            <li><span class="vmb-help-shortcut">Delete</span> - Delete selected node</li>
                            <li><span class="vmb-help-shortcut">Esc</span> - Cancel node editing</li>
                            <li><span class="vmb-help-shortcut">Enter</span> - Confirm node editing</li>
                        </ul>
                        
                        <h4>Canvas Navigation</h4>
                        <ul>
                            <li><span class="vmb-help-shortcut">Mouse Wheel</span> - Zoom in/out</li>
                            <li><span class="vmb-help-shortcut">Middle Mouse + Drag</span> - Pan canvas</li>
                            <li><span class="vmb-help-shortcut">Left Click + Drag (empty)</span> - Pan canvas</li>
                        </ul>
                        
                        <h4>Node Operations</h4>
                        <ul>
                            <li><span class="vmb-help-shortcut">Double Click Node</span> - Edit node value</li>
                            <li><span class="vmb-help-shortcut">Double Click Group</span> - Enter group</li>
                            <li><span class="vmb-help-shortcut">Click Connection</span> - Delete connection</li>
                        </ul>
                    `
            }
        }
    };

    // Build sidebar
    const categoriesContainer = modal.querySelector('.vmb-help-categories');
    const contentContainer = modal.querySelector('.vmb-help-content');

    let currentCategory = null;
    let currentTopic = null;

    Object.keys(documentation).forEach(categoryName => {
        const category = documentation[categoryName];

        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'vmb-help-category';

        const header = document.createElement('div');
        header.className = 'vmb-help-category-header';
        header.innerHTML = `
                <span>${category.icon} ${categoryName}</span>
                <span class="vmb-help-category-icon">▶</span>
            `;

        const topicsDiv = document.createElement('div');
        topicsDiv.className = 'vmb-help-topics';

        Object.keys(category.topics).forEach(topicName => {
            const topicDiv = document.createElement('div');
            topicDiv.className = 'vmb-help-topic';
            topicDiv.textContent = topicName;

            topicDiv.addEventListener('click', () => {
                // Update active states
                modal.querySelectorAll('.vmb-help-topic').forEach(t => t.classList.remove('active'));
                topicDiv.classList.add('active');

                // Show content
                contentContainer.innerHTML = category.topics[topicName];

                currentTopic = topicName;
            });

            topicsDiv.appendChild(topicDiv);
        });

        header.addEventListener('click', () => {
            const isExpanded = topicsDiv.classList.contains('expanded');

            // Collapse all categories first
            modal.querySelectorAll('.vmb-help-topics').forEach(t => t.classList.remove('expanded'));
            modal.querySelectorAll('.vmb-help-category-header').forEach(h => {
                h.classList.remove('active');
                h.querySelector('.vmb-help-category-icon').classList.remove('expanded');
            });

            if (!isExpanded) {
                // Expand this category
                topicsDiv.classList.add('expanded');
                header.classList.add('active');
                header.querySelector('.vmb-help-category-icon').classList.add('expanded');
                currentCategory = categoryName;
            }
        });

        categoryDiv.appendChild(header);
        categoryDiv.appendChild(topicsDiv);
        categoriesContainer.appendChild(categoryDiv);
    });

    // Close handlers
    const closeModal = () => {
        overlay.style.animation = 'vmb-fadeIn 0.2s ease-out reverse';
        setTimeout(() => {
            overlay.remove();
            style.remove();
        }, 200);
    };

    modal.querySelector('.vmb-help-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // ESC key to close
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

window.showVisualModuleBuilderHelp = showVisualModuleBuilderHelp;
# AI Node Generation Prompt for Visual Module Builder

Use this prompt format when asking AI to generate node systems using the VMB API.

---

## Prompt Template:

```
Generate Visual Module Builder node creation code using the VMB API that creates [DESCRIBE YOUR MODULE].

The code should use these API methods:
- vmb.createAndAddNode(type, x, y, options) - Create and add a node
- vmb.connectNodes(fromNode, fromPort, toNode, toPort) - Connect two nodes
- vmb.clearCanvas() - Clear all nodes (optional)

Output format:

// Get VMB instance
const vmb = window.vmbInstance;

// Clear existing (optional)
vmb.clearCanvas();

// Store node references
const nodes = {};

// Create nodes
nodes.myNode = vmb.createAndAddNode('nodeType', x, y, {
    label: 'Custom Label',
    value: 'default value',
    exposeProperty: true,
    groupName: 'PropertyGroup'
});

// Create more nodes...

// Connect nodes
vmb.connectNodes(nodes.node1, 0, nodes.node2, 0);

// Update module metadata
vmb.moduleName = 'ModuleName';
vmb.moduleNamespace = 'Custom';
vmb.moduleDescription = 'Description';
vmb.moduleIcon = 'fas fa-cube';
vmb.moduleColor = '#4CAF50';
vmb.allowMultiple = true;
vmb.drawInEditor = true;

// Mark as changed
vmb.hasUnsavedChanges = true;
vmb.saveState();

Available node types:
- Flow: "start", "update", "draw", "destroy", "loop", "onDestroy", "method", "event"
- Variables: "numberVar", "stringVar", "booleanVar", "colorVar", "vector2Var", "assetVar", "scriptVar"
- Logic: "if", "compare", "mathOp", "and", "or", "not"
- Actions: "setProperty", "getProperty", "log", "createGameObject", "destroyObject"
- Values: "number", "string", "boolean", "color", "vector2"
- GameObject: "getComponent", "transform", "position", "rotation", "scale"
- Math: "add", "subtract", "multiply", "divide", "random", "abs", "min", "max"
- Time: "deltaTime", "time", "delay"
- Input: "keyPressed", "mousePosition", "mouseButton"

createAndAddNode options:
{
    label: 'Custom Label',           // Override default label
    value: 'value',                   // Set initial value
    exposeProperty: true,             // Expose to inspector
    groupName: 'PropertyGroup',       // Property group name
    selectedProperty: 'propertyName', // For property dropdowns
    dropdownValue: '==',              // For comparison dropdowns
    wrapFlowInBraces: true           // Wrap flow code in braces
}
```

## Example Request:

"Generate VMB API code that creates a simple health system with:
- A health variable (number, exposed property named 'Health', default 100)
- A maxHealth variable (number, exposed property named 'Max Health', default 100)  
- An update flow that checks if health <= 0
- A destroy action when health reaches 0
- A log node that displays 'Player died!'
Position nodes in a logical left-to-right flow with 200px spacing."

## Expected Output Example:

```javascript
const vmb = window.vmbInstance;
vmb.clearCanvas();

const nodes = {};

// Create health variable
nodes.health = vmb.createAndAddNode('numberVar', 100, 100, {
    label: 'Health',
    value: 100,
    exposeProperty: true,
    groupName: 'Health'
});

// Create max health variable
nodes.maxHealth = vmb.createAndAddNode('numberVar', 100, 200, {
    label: 'Max Health',
    value: 100,
    exposeProperty: true,
    groupName: 'Health'
});

// Create update flow
nodes.updateFlow = vmb.createAndAddNode('update', 100, 300);

// Create comparison check
nodes.checkDeath = vmb.createAndAddNode('compare', 300, 300, {
    dropdownValue: '<='
});

// Create zero constant
nodes.zero = vmb.createAndAddNode('number', 300, 400, {
    value: 0
});

// Create if statement
nodes.ifDead = vmb.createAndAddNode('if', 500, 300);

// Create log message
nodes.logMessage = vmb.createAndAddNode('log', 700, 300);

// Create death message
nodes.deathMsg = vmb.createAndAddNode('string', 700, 400, {
    value: 'Player died!'
});

// Create destroy action
nodes.destroySelf = vmb.createAndAddNode('destroyObject', 700, 250);

// Connect the nodes
vmb.connectNodes(nodes.updateFlow, 0, nodes.checkDeath, 0); // Flow to compare
vmb.connectNodes(nodes.health, 0, nodes.checkDeath, 1); // Health value to compare
vmb.connectNodes(nodes.zero, 0, nodes.checkDeath, 2); // Zero to compare
vmb.connectNodes(nodes.checkDeath, 0, nodes.ifDead, 1); // Compare result to if condition
vmb.connectNodes(nodes.ifDead, 0, nodes.logMessage, 0); // If true flow to log
vmb.connectNodes(nodes.deathMsg, 0, nodes.logMessage, 1); // Message to log
vmb.connectNodes(nodes.logMessage, 0, nodes.destroySelf, 0); // Log flow to destroy

// Update module metadata
vmb.moduleName = 'HealthSystem';
vmb.moduleNamespace = 'Examples';
vmb.moduleDescription = 'A simple health system that destroys the object when health reaches 0';
vmb.moduleIcon = 'fas fa-heart';
vmb.moduleColor = '#e74c3c';
vmb.allowMultiple = false;
vmb.drawInEditor = false;

vmb.hasUnsavedChanges = true;
vmb.saveState();
vmb.log('Health system created successfully!', 'success');
```

## Tips for AI Generation:

1. **Use descriptive variable names** in the nodes object
2. **Position nodes logically** - left to right, top to bottom
3. **Space nodes appropriately** - 200-300px horizontal, 100-150px vertical
4. **Connect flow nodes sequentially** for execution order
5. **Connect data nodes to inputs** for values
6. **Include comments** explaining complex connections
7. **Test port indices** - outputs start at 0, inputs start at 0
8. **Use options object** for custom labels and values
9. **Set proper metadata** for the module

## Common Patterns:

### Variable with Exposed Property
```javascript
nodes.myVar = vmb.createAndAddNode('numberVar', 100, 100, {
    label: 'My Variable',
    value: 10,
    exposeProperty: true,
    groupName: 'Settings'
});
```

### Conditional Logic
```javascript
// Compare node
nodes.compare = vmb.createAndAddNode('compare', 300, 100, {
    dropdownValue: '>'
});

// If node
nodes.ifNode = vmb.createAndAddNode('if', 500, 100);

// Connect comparison result to if condition
vmb.connectNodes(nodes.compare, 0, nodes.ifNode, 1);
```

### Math Operation
```javascript
nodes.add = vmb.createAndAddNode('add', 300, 100);
nodes.num1 = vmb.createAndAddNode('number', 100, 100, { value: 5 });
nodes.num2 = vmb.createAndAddNode('number', 100, 150, { value: 3 });

vmb.connectNodes(nodes.num1, 0, nodes.add, 0);
vmb.connectNodes(nodes.num2, 0, nodes.add, 1);
```

### Set Property
```javascript
nodes.setProp = vmb.createAndAddNode('setProperty', 500, 100);
nodes.propName = vmb.createAndAddNode('string', 300, 100, { value: 'x' });
nodes.propValue = vmb.createAndAddNode('number', 300, 150, { value: 100 });

vmb.connectNodes(nodes.propName, 0, nodes.setProp, 2); // Name input
vmb.connectNodes(nodes.propValue, 0, nodes.setProp, 3); // Value input
```

## Port Index Reference:

Most nodes follow these patterns:

**Flow Nodes** (start, update, draw, etc.):
- Output 0: Flow out

**Variable Nodes**:
- Output 0: Value

**Logic Nodes** (if):
- Input 0: Flow in
- Input 1: Condition (boolean)
- Output 0: True flow
- Output 1: False flow

**Comparison Nodes**:
- Input 0: Value A
- Input 1: Value B
- Output 0: Result (boolean)

**Math Nodes** (add, subtract, etc.):
- Input 0: Value A
- Input 1: Value B
- Output 0: Result

**Action Nodes** (setProperty):
- Input 0: Flow in
- Input 1: Object (gameObject)
- Input 2: Property name (string)
- Input 3: Value (any)
- Output 0: Flow out

## Debugging:

If nodes don't appear:
1. Check node type is valid
2. Verify positions are reasonable (not negative, not too large)
3. Ensure node variable names are unique
4. Check that connections reference existing nodes

If connections fail:
1. Verify port indices are correct
2. Ensure nodes are created before connecting
3. Check that from/to nodes exist in nodes object

If execution fails:
1. Check syntax with vmb.log() statements
2. Verify all required properties are set
3. Use try-catch blocks for complex code

---

**Pro Tip**: After generating code, you can:
1. Paste it into the Code tab
2. Click "Validate" to check for errors
3. Switch to Nodes tab to see the visual result
4. Make adjustments and switch back to see updated code

const BracketScriptDocumentation = {
    "Getting Started": {
        "Introduction": {
            title: "Welcome to BracketScript",
            content: `
BracketScript is a clean, intuitive programming language that transpiles to JavaScript. 
It uses bracket notation to define code blocks, making it easy to read and write.

**Key Features:**
- Simple bracket-based syntax
- Automatic JavaScript transpilation
- Class-based object-oriented programming
- Nested functions support
- Minimal boilerplate code
- Forgiving syntax with helpful error messages

**Philosophy:**
BracketScript aims to reduce the cognitive load of programming by using a consistent,
predictable syntax. Every block is wrapped in brackets [], and keywords are simple
and intuitive.
            `,
            example: `[start
    log "Hello, BracketScript!"
]`
        },
        "Basic Syntax": {
            title: "Basic Syntax Rules",
            content: `
**Block Structure:**
All code is organized into blocks using square brackets [].

**Block Format:**
\`[BlockName ...content... ]\`

**Naming Conventions:**
- Classes start with uppercase: \`Person\`, \`Animal\`, \`GameObject\`
- Functions/methods start with lowercase: \`greet\`, \`calculate\`, \`update\`
- The special \`start\` block is the entry point

**Whitespace:**
BracketScript is whitespace-flexible. Line breaks and spaces are normalized,
though proper formatting improves readability.

**Comments:**
\`// Single line comments\`
\`/* Multi-line comments */\`
            `,
            example: `// This is a comment
[MyClass
    [constructor
        var name "Example"
    ]
]

/* This is a
   multi-line comment */
[start
    log "Starting program"
]`
        },
        "Hello World": {
            title: "Your First Program",
            content: `
The simplest BracketScript program uses the \`start\` block and the \`log\` keyword
to output to the console.

**Keywords Used:**
- \`start\` - Entry point block
- \`log\` - Console output (transpiles to console.log)

**Step by Step:**
1. Create a \`start\` block with \`[start]\`
2. Inside, use \`log\` followed by your message
3. Close the block with \`]\`
            `,
            example: `[start
    log "Hello, World!"
    log "Welcome to BracketScript"
    log 42
    log "The answer is: " + 42
]`
        }
    },
    
    "Variables & Data": {
        "Variables": {
            title: "Working with Variables",
            content: `
BracketScript supports multiple ways to declare variables depending on the context.

**Keywords:**
- \`var\` - Declare a class property or local variable
- \`prop\` - Declare a class property (no initial value)
- \`let\` - Block-scoped variable
- \`const\` - Constant variable

**Variable Assignment:**
Use \`set\` to assign values to existing variables.

**Scope:**
Variables declared with \`var\` inside a class become properties (\`this.varName\`).
Variables in functions are local unless prefixed with object notation.
            `,
            example: `[MyClass
    [constructor
        prop count
        var name "Default"
        var score 100
    ]
    
    [update
        var temp 42
        set this.count this.count + 1
        set temp temp * 2
        log temp
    ]
]

[start
    let x 10
    const MAX 100
    log x
    log MAX
]`
        },
        "Data Types": {
            title: "Data Types",
            content: `
BracketScript supports all JavaScript data types:

**Primitive Types:**
- **Numbers:** \`42\`, \`3.14\`, \`-17\`
- **Strings:** \`"hello"\`, \`'world'\`, \`\\\`template\\\`\`
- **Booleans:** \`true\`, \`false\`
- **Null:** \`null\`
- **Undefined:** \`undefined\`

**Complex Types:**
- **Arrays:** \`[1, 2, 3]\` (use JavaScript syntax)
- **Objects:** \`{key: "value"}\` (use JavaScript syntax)

**Type Conversion:**
JavaScript's automatic type conversion applies. Use explicit conversion
when needed: \`Number(str)\`, \`String(num)\`, etc.
            `,
            example: `[start
    var num 42
    var str "Hello"
    var bool true
    var nothing null
    
    var arr [1, 2, 3]
    var obj {name: "Alice", age: 30}
    
    log num
    log str
    log arr
    log obj.name
]`
        },
        "Operators": {
            title: "Operators",
            content: `
BracketScript supports all JavaScript operators:

**Arithmetic:**
\`+\` \`-\` \`*\` \`/\` \`%\` (add, subtract, multiply, divide, modulo)

**Comparison:**
\`==\` \`!=\` \`===\` \`!==\` \`<\` \`>\` \`<=\` \`>=\`

**Logical:**
\`&&\` (and), \`||\` (or), \`!\` (not)

**Assignment:**
\`=\` \`+=\` \`-=\` \`*=\` \`/=\` \`%=\`

**String Concatenation:**
Use \`+\` to join strings: \`"Hello" + " " + "World"\`

**Operator Precedence:**
Follows JavaScript rules. Use parentheses for clarity.
            `,
            example: `[start
    var a 10
    var b 5
    
    log a + b
    log a - b
    log a * b
    log a / b
    log a % b
    
    var x 5
    var y 10
    log x < y
    log x == 5
    log x != y
    
    log (a > b) && (x < y)
    log "Result: " + (a + b)
]`
        }
    },
    
    "Classes": {
        "Class Definition": {
            title: "Defining Classes",
            content: `
Classes in BracketScript start with an uppercase name and contain
constructor, properties, and methods.

**Structure:**
\`[ClassName ...methods... ]\`

**Constructor:**
The \`constructor\` block initializes the class. Use \`prop\` or \`var\`
to declare properties.

**Start Method:**
The optional \`start\` block provides default property values using \`init\`.

**Methods:**
Methods are blocks with lowercase names inside the class.
            `,
            example: `[Person
    [constructor
        prop name
        prop age
        var isAlive true
    ]
    
    [start
        init name "Unnamed" null
        init age 0 25
    ]
    
    [greet
        log "Hi, I'm " + this.name
    ]
    
    [celebrateBirthday
        set this.age this.age + 1
        log this.name + " is now " + this.age
    ]
]`
        },
        "Inheritance": {
            title: "Class Inheritance",
            content: `
Classes can inherit from other classes using the \`extends\` keyword.

**Syntax:**
\`[ChildClass extends ParentClass ...methods... ]\`

**Super Calls:**
Use \`super\` to call parent class methods:
\`super.methodName()\`

**Constructor Inheritance:**
Child classes automatically call \`super()\` in their constructor.

**Overriding Methods:**
Define a method with the same name to override parent behavior.
            `,
            example: `[Animal
    [constructor
        var name "Animal"
        var sound "..."
    ]
    
    [speak
        log this.name + " says " + this.sound
    ]
]

[Dog extends Animal
    [constructor
        var name "Dog"
        var sound "Woof!"
    ]
    
    [fetch
        log this.name + " is fetching!"
    ]
]

[start
    new dog Dog
    call dog.speak
    call dog.fetch
]`
        },
        "Properties": {
            title: "Class Properties",
            content: `
Properties store data within class instances.

**Declaration Methods:**

**1. prop** - Declare without initial value (set to null)
\`prop propertyName\`

**2. var** - Declare with initial value
\`var propertyName value\`

**3. init** - Set default and override values in start block
\`init propertyName defaultValue actualValue\`

**Accessing Properties:**
Use \`this.propertyName\` within methods.
Use \`object.propertyName\` from outside.

**Property Privacy:**
All properties are public in BracketScript (JavaScript limitation).
            `,
            example: `[Rectangle
    [constructor
        var width 0
        var height 0
        prop area
        prop perimeter
    ]
    
    [start
        init width 10 null
        init height 5 null
    ]
    
    [calculate
        set this.area this.width * this.height
        set this.perimeter 2 * (this.width + this.height)
    ]
    
    [display
        log "Area: " + this.area
        log "Perimeter: " + this.perimeter
    ]
]

[start
    new rect Rectangle
    set rect.width 20
    set rect.height 15
    call rect.calculate
    call rect.display
]`
        },
        "Methods": {
            title: "Class Methods",
            content: `
Methods are functions that belong to a class. They can access class
properties using \`this\`.

**Defining Methods:**
Create a block with a lowercase name inside the class.

**Method Structure:**
\`[methodName ...statements... ]\`

**Calling Methods:**
\`call object.methodName\`

**Method Chaining:**
Return \`this\` to enable chaining (advanced).

**Best Practices:**
- Use descriptive names
- Keep methods focused on a single task
- Use \`this\` to access properties
            `,
            example: `[Counter
    [constructor
        var count 0
        var step 1
    ]
    
    [increment
        set this.count this.count + this.step
    ]
    
    [decrement
        set this.count this.count - this.step
    ]
    
    [reset
        set this.count 0
    ]
    
    [display
        log "Count: " + this.count
    ]
    
    [setStep newStep
        set this.step newStep
    ]
]`
        }
    },
    
    "Functions": {
        "Functions": {
            title: "Standalone Functions",
            content: `
Functions are reusable blocks of code that aren't part of a class.

**Defining Functions:**
\`[functionName ...statements... ]\`

Function names start with lowercase and don't contain \`constructor\`
or property declarations.

**Calling Functions:**
\`call functionName\`

**Return Values:**
Use \`return\` to send values back from functions.

**Nested Functions:**
Functions can be defined inside other functions or methods for
encapsulation and organization.
            `,
            example: `[greet
    log "Hello from a function!"
]

[add
    var a 5
    var b 10
    var sum a + b
    log "Sum: " + sum
    return sum
]

[start
    call greet
    call add
]`
        },
        "Nested Functions": {
            title: "Nested Functions",
            content: `
Functions can be nested inside other functions or class methods
for better organization and encapsulation.

**Benefits:**
- Organize related code together
- Create helper functions with limited scope
- Improve code readability
- Enable closures and private functions

**Syntax:**
Simply define a function block inside another block.

**Scope:**
Nested functions have access to their parent's variables (closure).

**Usage:**
Call nested functions like any other function.
            `,
            example: `[Calculator
    [constructor
        var result 0
    ]
    
    [complexCalculation x y
        [helper value
            return value * 2
        ]
        
        var doubled call helper x
        var tripled y * 3
        set this.result doubled + tripled
        log "Result: " + this.result
    ]
]

[processData
    [validate data
        return data !== null && data !== undefined
    ]
    
    [transform data
        return data * 10
    ]
    
    var input 42
    if call validate input
        var output call transform input
        log "Output: " + output
    ]
]

[start
    new calc Calculator
    call calc.complexCalculation 5 7
]`
        },
        "Return Values": {
            title: "Returning Values",
            content: `
Use the \`return\` keyword to send values back from functions and methods.

**Syntax:**
\`return value\`
\`return expression\`

**Early Returns:**
Use \`return\` to exit a function early.

**Multiple Returns:**
Functions can have multiple return statements based on conditions.

**No Return:**
Functions without \`return\` automatically return \`undefined\`.

**Using Returned Values:**
Store in variables or use directly in expressions.
            `,
            example: `[add a b
    return a + b
]

[isEven number
    if number % 2 == 0
        return true
    ]
    return false
]

[getGrade score
    if score >= 90
        return "A"
    ]
    if score >= 80
        return "B"
    ]
    if score >= 70
        return "C"
    ]
    return "F"
]

[start
    var sum call add 10 20
    log "Sum: " + sum
    
    var even call isEven 42
    log "Is even: " + even
    
    var grade call getGrade 85
    log "Grade: " + grade
]`
        }
    },
    
    "Control Flow": {
        "If Statements": {
            title: "Conditional Execution",
            content: `
Use \`if\` and \`else\` to execute code conditionally.

**Basic If:**
\`if condition ...statements... ]\`

**If-Else:**
\`if condition ...statements... ]
else ...statements... ]\`

**Nested Conditions:**
You can nest if statements for complex logic.

**Conditions:**
Any JavaScript expression that evaluates to true/false.

**Important:**
Currently, if/else blocks require careful bracket management.
Each conditional block needs its closing bracket.
            `,
            example: `[start
    var age 18
    
    if age >= 18
        log "You are an adult"
    ]
    
    var score 85
    if score >= 90
        log "Grade: A"
    else if score >= 80
        log "Grade: B"
    else
        log "Grade: C"
    ]
    
    var x 10
    var y 20
    if x < y && x > 0
        log "x is positive and less than y"
    ]
]`
        },
        "While Loops": {
            title: "While Loops",
            content: `
Use \`while\` to repeat code while a condition is true.

**Syntax:**
\`while condition ...statements... ]\`

**Condition:**
Checked before each iteration. Loop continues while true.

**Infinite Loops:**
Be careful! If the condition never becomes false, the loop runs forever.

**Breaking Out:**
Modify variables inside the loop to eventually make the condition false.

**Use Cases:**
- Counting iterations
- Processing until a condition is met
- Game loops
- Event waiting
            `,
            example: `[start
    var count 0
    while count < 5
        log "Count: " + count
        set count count + 1
    ]
    
    var x 1
    while x <= 10
        log x * x
        set x x + 1
    ]
    
    var sum 0
    var i 1
    while i <= 100
        set sum sum + i
        set i i + 1
    ]
    log "Sum 1-100: " + sum
]`
        },
        "For Loops": {
            title: "For Loops",
            content: `
Use \`for\` loops for counted iterations.

**Syntax:**
\`for initialization; condition; increment ...statements... ]\`

**Parts:**
1. **Initialization:** Set starting value (\`let i = 0\`)
2. **Condition:** Continue while true (\`i < 10\`)
3. **Increment:** Update after each iteration (\`i++\`)

**Use Cases:**
- Iterating a specific number of times
- Array iteration
- Counting up or down

**Important:**
Use JavaScript syntax for the for loop header.
            `,
            example: `[start
    for let i = 0; i < 5; i++
        log "Iteration: " + i
    ]
    
    for let x = 10; x >= 0; x--
        log "Countdown: " + x
    ]
    
    var arr [1, 2, 3, 4, 5]
    for let i = 0; i < arr.length; i++
        log "Element: " + arr[i]
    ]
    
    for let i = 0; i < 10; i += 2
        log "Even number: " + i
    ]
]`
        },
        "Each Loops": {
            title: "Each/For-Each Loops",
            content: `
Use \`each\` to iterate over arrays and collections.

**Syntax:**
\`each item in collection ...statements... ]\`

**Benefits:**
- Cleaner syntax than traditional for loops
- Automatic iteration over all elements
- No index management needed

**Use Cases:**
- Processing array elements
- Iterating over object properties
- Collection traversal

**Note:**
This transpiles to JavaScript's for...of loop.
            `,
            example: `[start
    var numbers [10, 20, 30, 40, 50]
    each num in numbers
        log "Number: " + num
    ]
    
    var names ["Alice", "Bob", "Charlie"]
    each name in names
        log "Hello, " + name
    ]
    
    var items [{id: 1, name: "Item1"}, {id: 2, name: "Item2"}]
    each item in items
        log item.name
    ]
]`
        }
    },
    
    "Keywords Reference": {
        "Core Keywords": {
            title: "Essential Keywords",
            content: `
**Block & Structure:**
- \`start\` - Entry point block or initialization method
- \`constructor\` - Class constructor block
- \`extends\` - Class inheritance

**Variables & Properties:**
- \`prop\` - Declare class property (no value)
- \`var\` - Declare with initial value
- \`let\` - Block-scoped variable
- \`const\` - Constant variable

**Assignment & Initialization:**
- \`init\` - Initialize property with default/override
- \`set\` - Assign value to variable

**Object Creation:**
- \`new\` - Create class instance
            `,
            example: `[MyClass extends BaseClass
    [constructor
        prop x
        var y 10
        let z 20
        const MAX 100
    ]
    
    [start
        init x 0 5
    ]
]

[start
    new obj MyClass
    set obj.x 42
]`
        },
        "Control Keywords": {
            title: "Control Flow Keywords",
            content: `
**Conditionals:**
- \`if\` - Conditional execution
- \`else\` - Alternative execution

**Loops:**
- \`while\` - Loop while condition is true
- \`for\` - Counted loop
- \`each\` - Iterate over collection
- \`in\` - Used with each (\`each item in array\`)

**Function Control:**
- \`return\` - Return value from function
- \`call\` - Invoke function or method
            `,
            example: `[start
    if true
        log "true branch"
    else
        log "false branch"
    ]
    
    while false
        log "won't execute"
    ]
    
    for let i = 0; i < 3; i++
        log i
    ]
    
    each item in [1,2,3]
        log item
    ]
]`
        },
        "Utility Keywords": {
            title: "Utility Keywords",
            content: `
**Console Output:**
- \`log\` - Console output (console.log)

**Object Reference:**
- \`this\` - Current object reference
- \`super\` - Parent class reference

**Functions:**
- \`func\` - Alternative function declaration (optional)
- \`call\` - Invoke function or method

**Future Keywords:**
Reserved for future features:
- \`async\`, \`await\` - Asynchronous operations
- \`try\`, \`catch\` - Error handling
- \`import\`, \`export\` - Module system
            `,
            example: `[MyClass
    [greet
        log "Hello from " + this.name
    ]
]

[MyChild extends MyClass
    [greet
        call super.greet
        log "Child greeting"
    ]
]

[start
    new obj MyClass
    call obj.greet
]`
        }
    },
    
    "Examples": {
        "Basic Examples": {
            title: "Simple Programs",
            content: `
These examples demonstrate fundamental BracketScript concepts.
            `,
            example: `// Hello World
[start
    log "Hello, World!"
]

// Variables
[start
    var name "Alice"
    var age 25
    log name + " is " + age
]

// Simple Math
[start
    var a 10
    var b 20
    var sum a + b
    log "Sum: " + sum
]

// Conditional
[start
    var x 5
    if x > 0
        log "Positive"
    else
        log "Not positive"
    ]
]`
        },
        "Class Examples": {
            title: "Object-Oriented Examples",
            content: `
Examples showcasing classes, inheritance, and OOP concepts.
            `,
            example: `// Simple Class
[Person
    [constructor
        var name "Unknown"
        var age 0
    ]
    
    [greet
        log "Hi, I'm " + this.name
    ]
]

[start
    new p Person
    set p.name "Alice"
    call p.greet
]

// Inheritance
[Animal
    [constructor
        var name "Animal"
    ]
    
    [speak
        log this.name + " makes a sound"
    ]
]

[Dog extends Animal
    [speak
        log this.name + " barks!"
    ]
]

[start
    new dog Dog
    set dog.name "Rex"
    call dog.speak
]`
        },
        "Game Loop": {
            title: "Game Loop Example",
            content: `
A simple game loop structure using BracketScript.
            `,
            example: `[GameObject
    [constructor
        var x 0
        var y 0
        var active true
    ]
    
    [update
        set this.x this.x + 1
    ]
    
    [draw
        log "Drawing at: " + this.x + "," + this.y
    ]
]

[Game
    [constructor
        var running false
        var objects []
    ]
    
    [init
        set this.running true
        new obj GameObject
        set obj.x 100
        set obj.y 200
        log "Game initialized"
    ]
    
    [update
        if this.running
            log "Updating game..."
        ]
    ]
]

[start
    new game Game
    call game.init
    call game.update
]`
        },
        "Calculator": {
            title: "Calculator Class",
            content: `
A calculator class with multiple operations.
            `,
            example: `[Calculator
    [constructor
        var result 0
        var history []
    ]
    
    [add a b
        set this.result a + b
        log "Addition: " + this.result
        return this.result
    ]
    
    [subtract a b
        set this.result a - b
        log "Subtraction: " + this.result
        return this.result
    ]
    
    [multiply a b
        set this.result a * b
        log "Multiplication: " + this.result
        return this.result
    ]
    
    [divide a b
        if b == 0
            log "Error: Division by zero"
            return null
        ]
        set this.result a / b
        log "Division: " + this.result
        return this.result
    ]
    
    [clear
        set this.result 0
        log "Calculator cleared"
    ]
]

[start
    new calc Calculator
    call calc.add 10 5
    call calc.multiply 8 7
    call calc.divide 100 4
    call calc.subtract 50 25
]`
        },
        "Todo List": {
            title: "Todo List Manager",
            content: `
A todo list manager with add, remove, and display functionality.
            `,
            example: `[TodoItem
    [constructor
        var text ""
        var completed false
        var id 0
    ]
    
    [toggle
        set this.completed !this.completed
    ]
    
    [display
        var status this.completed ? "✓" : "○"
        log status + " " + this.text
    ]
]

[TodoList
    [constructor
        var items []
        var nextId 1
    ]
    
    [add text
        new item TodoItem
        set item.text text
        set item.id this.nextId
        set this.nextId this.nextId + 1
        log "Added: " + text
    ]
    
    [displayAll
        log "=== Todo List ==="
        each item in this.items
            call item.display
        ]
    ]
    
    [clear
        set this.items []
        log "List cleared"
    ]
]

[start
    new list TodoList
    call list.add "Learn BracketScript"
    call list.add "Build a project"
    call list.add "Share with friends"
    call list.displayAll
]`
        }
    },

    "Array Operations": {
        "Array Basics": {
            title: "Working with Arrays",
            content: `
BracketScript provides built-in keywords for common array operations,
making array manipulation intuitive and straightforward.

**Creating Arrays:**
Use JavaScript syntax: \`[1, 2, 3]\` or \`["a", "b", "c"]\`

**Array Methods:**
- \`push\` - Add element(s) to end
- \`pop\` - Remove and return last element
- \`shift\` - Remove and return first element
- \`unshift\` - Add element(s) to beginning
- \`splice\` - Add/remove elements at any position
- \`slice\` - Extract portion of array
            `,
            example: `[start
    var fruits ["apple", "banana"]
    
    push fruits "orange"
    log fruits // ["apple", "banana", "orange"]
    
    pop fruits
    log fruits // ["apple", "banana"]
    
    shift fruits
    log fruits // ["banana"]
    
    unshift fruits "grape" "mango"
    log fruits // ["grape", "mango", "banana"]
]`
        },
        "Array Iteration": {
            title: "Iterating Over Arrays",
            content: `
**Iteration Keywords:**
- \`forEach\` - Execute function for each element
- \`map\` - Transform each element
- \`filter\` - Keep elements matching condition
- \`reduce\` - Reduce array to single value
- \`find\` - Find first matching element
- \`findIndex\` - Find index of first match
- \`some\` - Check if any element matches
- \`every\` - Check if all elements match

**Using Callbacks:**
Pass arrow functions or function references for processing.
            `,
            example: `[start
    var numbers [1, 2, 3, 4, 5]
    
    // Map to double values
    var doubled map numbers (x => x * 2)
    log doubled // [2, 4, 6, 8, 10]
    
    // Filter even numbers
    var evens filter numbers (x => x % 2 == 0)
    log evens // [2, 4]
    
    // Find first > 3
    var found find numbers (x => x > 3)
    log found // 4
    
    // Check if any > 4
    var hasLarge some numbers (x => x > 4)
    log hasLarge // true
]`
        },
        "Array Search & Sort": {
            title: "Searching and Sorting",
            content: `
**Search Methods:**
- \`includes\` - Check if element exists
- \`indexOf\` - Find position of element
- \`find\` - Find first matching element
- \`findIndex\` - Find index of match

**Sorting:**
- \`sort\` - Sort array (optionally with compare function)
- \`reverse\` - Reverse array order

**Combining:**
- \`concat\` - Merge arrays
- \`join\` - Convert to string with separator
            `,
            example: `[start
    var arr [3, 1, 4, 1, 5, 9]
    
    // Check existence
    var has4 includes arr 4
    log has4 // true
    
    // Find position
    var pos indexOf arr 5
    log pos // 4
    
    // Sort ascending
    sort arr
    log arr // [1, 1, 3, 4, 5, 9]
    
    // Reverse
    reverse arr
    log arr // [9, 5, 4, 3, 1, 1]
    
    // Join to string
    var str join arr ", "
    log str // "9, 5, 4, 3, 1, 1"
]`
        },
        "Array Manipulation": {
            title: "Advanced Array Operations",
            content: `
**Modifying Arrays:**
- \`splice\` - Remove/insert elements at position
- \`slice\` - Extract portion without modifying

**Syntax:**
- \`splice array start deleteCount ...items\`
- \`slice array start end\`

**Combining:**
- \`concat\` - Merge multiple arrays

**Examples show common patterns for array manipulation.**
            `,
            example: `[start
    var arr [1, 2, 3, 4, 5]
    
    // Remove 2 elements at index 1
    splice arr 1 2
    log arr // [1, 4, 5]
    
    // Insert at index 1
    splice arr 1 0 10 20
    log arr // [1, 10, 20, 4, 5]
    
    // Extract slice (doesn't modify)
    var arr2 [1, 2, 3, 4, 5]
    var part slice arr2 1 4
    log part // [2, 3, 4]
    log arr2 // [1, 2, 3, 4, 5] (unchanged)
    
    // Concatenate
    var combined concat arr arr2
    log combined
]`
        }
    },

    "Object Operations": {
        "Object Methods": {
            title: "Working with Objects",
            content: `
BracketScript provides keywords for common object operations.

**Object Inspection:**
- \`keys\` - Get array of object keys
- \`values\` - Get array of object values
- \`entries\` - Get array of [key, value] pairs

**Object Manipulation:**
- \`assign\` - Copy properties from source to target
- \`freeze\` - Make object immutable
- \`seal\` - Prevent adding/removing properties

**Property Management:**
- \`delete\` - Remove property from object
            `,
            example: `[start
    var person {name: "Alice", age: 30, city: "NYC"}
    
    // Get keys
    var propNames keys person
    log propNames // ["name", "age", "city"]
    
    // Get values
    var propValues values person
    log propValues // ["Alice", 30, "NYC"]
    
    // Get entries
    var entries entries person
    log entries // [["name", "Alice"], ["age", 30], ["city", "NYC"]]
    
    // Assign properties
    var defaults {age: 0, country: "USA"}
    assign person defaults
    log person // Now has country property
    
    // Delete property
    delete person.city
    log person // city removed
]`
        },
        "Object Immutability": {
            title: "Freezing and Sealing Objects",
            content: `
Control object mutability with freeze and seal operations.

**freeze:**
Makes object completely immutable. Cannot:
- Add new properties
- Delete properties
- Modify existing properties

**seal:**
Prevents adding/removing properties. Can still:
- Modify existing properties

**Use Cases:**
- Configuration objects
- Constants
- Preventing accidental modifications
            `,
            example: `[start
    var config {host: "localhost", port: 8080}
    
    // Freeze config
    freeze config
    set config.port 3000 // Error: Cannot modify
    set config.newProp "test" // Error: Cannot add
    
    var settings {theme: "dark", lang: "en"}
    
    // Seal settings
    seal settings
    set settings.theme "light" // OK: Can modify
    set settings.newProp "test" // Error: Cannot add
    delete settings.lang // Error: Cannot delete
]`
        }
    },

    "Math Operations": {
        "Math Methods": {
            title: "Mathematical Operations",
            content: `
BracketScript provides convenient keywords for math operations.

**Basic Math:**
- \`abs\` - Absolute value
- \`ceil\` - Round up
- \`floor\` - Round down
- \`round\` - Round to nearest integer
- \`sqrt\` - Square root
- \`pow\` - Power (x^y)

**Min/Max:**
- \`max\` - Maximum value
- \`min\` - Minimum value

**Random:**
- \`random\` - Random number (0-1)

**Generic Math:**
- \`math\` - Access any Math method
            `,
            example: `[start
    // Basic operations
    var neg abs -42
    log neg // 42
    
    var up ceil 3.2
    log up // 4
    
    var down floor 3.8
    log down // 3
    
    var near round 3.6
    log near // 4
    
    // Power and root
    var squared pow 5 2
    log squared // 25
    
    var root sqrt 16
    log root // 4
    
    // Min/Max
    var maximum max 10 5 8 15 3
    log maximum // 15
    
    var minimum min 10 5 8 15 3
    log minimum // 3
    
    // Random
    var rand random
    log rand // Random 0-1
]`
        },
        "Math Calculations": {
            title: "Advanced Math Operations",
            content: `
Use the generic \`math\` keyword to access any Math method.

**Syntax:**
\`math methodName arg1 arg2 ...\`

**Available Methods:**
- Trigonometric: sin, cos, tan, asin, acos, atan, atan2
- Logarithmic: log, log10, log2
- Exponential: exp
- Other: sign, trunc, cbrt

**Constants:**
Access with \`Math.PI\`, \`Math.E\`, etc. in expressions.
            `,
            example: `[Calculator
    [constructor
        var result 0
    ]
    
    [calculate angle
        // Trigonometry
        var sine math sin angle
        var cosine math cos angle
        log "sin(" + angle + ") = " + sine
        log "cos(" + angle + ") = " + cosine
        
        // Logarithms
        var log10 math log10 100
        log "log10(100) = " + log10 // 2
        
        // Using Math constants
        var circum 2 * Math.PI * 5
        log "Circumference: " + circum
    ]
]

[start
    new calc Calculator
    call calc.calculate Math.PI / 4
]`
        }
    },

    "String Operations": {
        "String Methods": {
            title: "String Manipulation",
            content: `
BracketScript provides keywords for common string operations.

**Transformation:**
- \`toLowerCase\` - Convert to lowercase
- \`toUpperCase\` - Convert to uppercase
- \`trim\` - Remove whitespace from ends

**Extraction:**
- \`substring\` - Extract substring
- \`charAt\` - Get character at position

**Modification:**
- \`split\` - Split into array
- \`replace\` - Replace substring

**All methods follow the pattern: keyword target args**
            `,
            example: `[start
    var text "  Hello World  "
    
    // Trim whitespace
    var clean trim text
    log clean // "Hello World"
    
    // Case conversion
    var lower toLowerCase clean
    log lower // "hello world"
    
    var upper toUpperCase clean
    log upper // "HELLO WORLD"
    
    // Character access
    var char charAt clean 0
    log char // "H"
    
    // Substring
    var sub substring clean 0 5
    log sub // "Hello"
    
    // Split
    var words split clean " "
    log words // ["Hello", "World"]
    
    // Replace
    var replaced replace clean "World" "BracketScript"
    log replaced // "Hello BracketScript"
]`
        },
        "String Processing": {
            title: "Advanced String Operations",
            content: `
Combine string methods for powerful text processing.

**Common Patterns:**
- Clean and normalize input
- Parse delimited data
- Format output
- Validate strings

**Chaining Operations:**
Store intermediate results or chain with JavaScript's method syntax.
            `,
            example: `[TextProcessor
    [constructor
        var text ""
    ]
    
    [normalize input
        var trimmed trim input
        var lower toLowerCase trimmed
        set this.text lower
        return this.text
    ]
    
    [parseCSV csv
        var lines split csv "\\n"
        var result []
        
        each line in lines
            var trimmed trim line
            if trimmed != ""
                var fields split trimmed ","
                push result fields
            ]
        ]
        
        return result
    ]
    
    [formatName firstName lastName
        var first toLowerCase firstName
        var last toLowerCase lastName
        var firstUpper charAt first 0
        var lastUpper charAt last 0
        return firstUpper + substring first 1 first.length + " " + lastUpper + substring last 1 last.length
    ]
]

[start
    new processor TextProcessor
    var formatted call processor.formatName "john" "DOE"
    log formatted // "John Doe"
]`
        }
    },

    "Type Checking": {
        "Type Methods": {
            title: "Checking Data Types",
            content: `
BracketScript provides keywords for runtime type checking.

**Type Inspection:**
- \`typeof\` - Get type name as string
- \`instanceof\` - Check if object is instance of class
- \`isArray\` - Check if value is array
- \`isNaN\` - Check if value is Not-a-Number
- \`isFinite\` - Check if number is finite

**Return Values:**
These operations return boolean (true/false) or string values
that can be used in conditions.
            `,
            example: `[start
    var num 42
    var str "hello"
    var arr [1, 2, 3]
    var obj {key: "value"}
    
    // typeof returns string
    var t1 typeof num
    log t1 // "number"
    
    var t2 typeof str
    log t2 // "string"
    
    var t3 typeof arr
    log t3 // "object"
    
    // isArray for arrays
    var check1 isArray arr
    log check1 // true
    
    var check2 isArray str
    log check2 // false
    
    // isNaN for invalid numbers
    var invalid 0 / 0
    var check3 isNaN invalid
    log check3 // true
    
    // isFinite for finite numbers
    var check4 isFinite num
    log check4 // true
    
    var inf 1 / 0
    var check5 isFinite inf
    log check5 // false
]`
        },
        "Type Validation": {
            title: "Validating Input Types",
            content: `
Use type checking for input validation and error prevention.

**Best Practices:**
- Check types before processing
- Provide meaningful error messages
- Return early on invalid types
- Use appropriate checks for context

**Common Patterns:**
Shown in examples for robust code.
            `,
            example: `[Validator
    [isValidNumber value
        if typeof value != "number"
            return false
        ]
        if isNaN value
            return false
        ]
        if !isFinite value
            return false
        ]
        return true
    ]
    
    [isValidArray value
        return isArray value
    ]
    
    [isValidString value
        return typeof value == "string"
    ]
    
    [processInput value
        if call this.isValidNumber value
            log "Valid number: " + value
        else if call this.isValidString value
            log "Valid string: " + value
        else if call this.isValidArray value
            log "Valid array with " + value.length + " items"
        else
            log "Invalid input type"
        ]
    ]
]

[start
    new validator Validator
    call validator.processInput 42
    call validator.processInput "hello"
    call validator.processInput [1, 2, 3]
    call validator.processInput null
]`
        }
    },

    "Console Operations": {
        "Console Methods": {
            title: "Console Output Types",
            content: `
BracketScript provides multiple console output methods for different purposes.

**Output Levels:**
- \`log\` - Standard output (console.log)
- \`info\` - Informational messages (console.info)
- \`warn\` - Warning messages (console.warn)
- \`error\` - Error messages (console.error)
- \`debug\` - Debug information (console.debug)

**Special Methods:**
- \`table\` - Display data in table format
- \`clear\` - Clear the console

**Use Cases:**
Different levels help categorize and filter console output.
            `,
            example: `[Logger
    [constructor
        var level "info"
    ]
    
    [logInfo message
        info "ℹ️ INFO: " + message
    ]
    
    [logWarning message
        warn "⚠️ WARNING: " + message
    ]
    
    [logError message
        error "❌ ERROR: " + message
    ]
    
    [logDebug message
        debug "🐛 DEBUG: " + message
    ]
    
    [displayData data
        table data
    ]
]

[start
    new logger Logger
    
    call logger.logInfo "Application started"
    call logger.logWarning "Low memory"
    call logger.logError "Failed to connect"
    call logger.logDebug "Variable x = 42"
    
    var users [{name: "Alice", age: 30}, {name: "Bob", age: 25}]
    call logger.displayData users
    
    // Clear console
    clear
]`
        },
        "Debugging Output": {
            title: "Effective Console Usage",
            content: `
Use console methods strategically for debugging and monitoring.

**Best Practices:**
- Use appropriate levels for different message types
- Include context in messages
- Use table for structured data
- Clear console when starting fresh runs

**Performance Note:**
Remove excessive logging in production code.
            `,
            example: `[GameEngine
    [constructor
        var debugMode true
        var frameCount 0
    ]
    
    [init
        if this.debugMode
            clear
            info "=== Game Engine Initializing ==="
        ]
    ]
    
    [update deltaTime
        set this.frameCount this.frameCount + 1
        
        if this.debugMode
            if this.frameCount % 60 == 0
                debug "Frame: " + this.frameCount + " Delta: " + deltaTime
            ]
        ]
        
        if deltaTime > 100
            warn "High delta time detected: " + deltaTime + "ms"
        ]
    ]
    
    [onError errorMsg
        error "Game Error: " + errorMsg
        var errorData {
            frame: this.frameCount,
            message: errorMsg,
            timestamp: Date.now()
        }
        table errorData
    ]
]`
        }
    },

    "Advanced Control Flow": {
        "For-Of Loops": {
            title: "Iterating with 'of'",
            content: `
The \`of\` keyword provides an alternative syntax for iterating over arrays and iterables.

**Syntax:**
\`of item in collection ...statements... ]\`

**Difference from 'each':**
Both transpile to for...of loops, providing clean iteration syntax.

**Use Cases:**
- Iterating arrays
- Processing collections
- Cleaner than traditional for loops
            `,
            example: `[start
    var colors ["red", "green", "blue"]
    
    // Using 'of'
    of color in colors
        log "Color: " + color
    ]
    
    var scores [85, 92, 78, 95]
    var sum 0
    
    of score in scores
        set sum sum + score
    ]
    
    log "Average: " + (sum / scores.length)
    
    // With objects
    var items [
        {name: "Apple", price: 1.50},
        {name: "Banana", price: 0.75}
    ]
    
    of item in items
        log item.name + ": $" + item.price
    ]
]`
        },
        "Try-Catch-Finally": {
            title: "Error Handling",
            content: `
BracketScript supports try-catch-finally for error handling.

**Structure:**
\`try ...statements... ]
catch error ...handle error... ]
finally ...cleanup... ]\`

**Keywords:**
- \`try\` - Execute code that might throw
- \`catch\` - Handle errors
- \`finally\` - Always execute (optional)
- \`throw\` - Throw custom errors

**Best Practices:**
- Catch specific errors when possible
- Always clean up resources
- Log errors for debugging
            `,
            example: `[DataProcessor
    [processFile filename
        var data null
        
        try
            log "Opening file: " + filename
            // Simulate file operation
            if filename == ""
                throw "Invalid filename"
            ]
            set data "file contents"
        catch error
            error "Error processing file: " + error
            set data null
        finally
            log "Cleanup completed"
        ]
        
        return data
    ]
    
    [divide a b
        try
            if b == 0
                throw "Division by zero"
            ]
            return a / b
        catch error
            error "Math error: " + error
            return null
        ]
    ]
]

[start
    new processor DataProcessor
    call processor.processFile ""
    var result call processor.divide 10 0
]`
        }
    },

// Update the "Keywords Reference" section to include all new keywords:
    "Keywords Reference": {
        "Core Keywords": {
            title: "Essential Keywords",
            content: `
**Block & Structure:**
- \`start\` - Entry point block or initialization method
- \`constructor\` - Class constructor block
- \`extends\` - Class inheritance

**Variables & Properties:**
- \`prop\` - Declare class property (no value)
- \`var\` - Declare with initial value
- \`let\` - Block-scoped variable
- \`const\` - Constant variable

**Assignment & Initialization:**
- \`init\` - Initialize property with default/override
- \`set\` - Assign value to variable
- \`delete\` - Remove property from object

**Object Creation:**
- \`new\` - Create class instance

**Special Values:**
- \`null\` - Null value
- \`undefined\` - Undefined value
- \`this\` - Current object reference
- \`super\` - Parent class reference
            `,
            example: `[MyClass extends BaseClass
    [constructor
        prop x
        var y 10
        let z 20
        const MAX 100
    ]
    
    [start
        init x 0 5
    ]
    
    [method
        delete this.y
    ]
]

[start
    new obj MyClass
    set obj.x 42
]`
        },
        "Control Keywords": {
            title: "Control Flow Keywords",
            content: `
**Conditionals:**
- \`if\` - Conditional execution
- \`else\` - Alternative execution
- \`elseif\` - Chained conditions

**Loops:**
- \`while\` - Loop while condition is true
- \`do\` - Do-while loop
- \`for\` - Counted loop
- \`each\` / \`forEach\` - Iterate over collection
- \`of\` - For-of iteration
- \`in\` - Used with each/of

**Loop Control:**
- \`break\` - Exit loop
- \`continue\` - Skip to next iteration

**Function Control:**
- \`return\` - Return value from function
- \`call\` - Invoke function or method
- \`yield\` - Yield value (generators)

**Error Handling:**
- \`try\` - Try block
- \`catch\` - Catch errors
- \`finally\` - Finally block
- \`throw\` - Throw error
            `,
            example: `[start
    try
        for let i = 0; i < 5; i++
            if i == 2
                continue
            ]
            if i == 4
                break
            ]
            log i
        ]
    catch error
        error "Error: " + error
    finally
        log "Done"
    ]
]`
        },
        "Array Keywords": {
            title: "Array Operations",
            content: `
**Modification:**
- \`push\` - Add to end
- \`pop\` - Remove from end
- \`shift\` - Remove from start
- \`unshift\` - Add to start
- \`splice\` - Insert/remove at position
- \`reverse\` - Reverse order
- \`sort\` - Sort array

**Extraction:**
- \`slice\` - Extract portion
- \`concat\` - Combine arrays
- \`join\` - Join to string

**Iteration:**
- \`forEach\` - Execute for each
- \`map\` - Transform elements
- \`filter\` - Filter elements
- \`reduce\` - Reduce to value
- \`find\` - Find element
- \`findIndex\` - Find index
- \`some\` - Test if any match
- \`every\` - Test if all match

**Search:**
- \`includes\` - Check existence
- \`indexOf\` - Find position
            `,
            example: `[start
    var arr [1, 2, 3, 4, 5]
    
    push arr 6
    pop arr
    var doubled map arr (x => x * 2)
    var evens filter arr (x => x % 2 == 0)
    var has3 includes arr 3
    sort arr
    reverse arr
]`
        },
        "Object Keywords": {
            title: "Object Operations",
            content: `
**Inspection:**
- \`keys\` - Get object keys
- \`values\` - Get object values
- \`entries\` - Get key-value pairs

**Manipulation:**
- \`assign\` - Copy properties
- \`freeze\` - Make immutable
- \`seal\` - Prevent add/remove properties

**Property Management:**
- \`delete\` - Remove property
- \`get\` / \`getter\` - Property getter
- \`set\` / \`setter\` - Property setter
            `,
            example: `[start
    var obj {a: 1, b: 2}
    
    var k keys obj
    var v values obj
    var e entries obj
    
    assign obj {c: 3}
    freeze obj
    
    delete obj.b
]`
        },
        "Math Keywords": {
            title: "Mathematical Operations",
            content: `
**Basic Math:**
- \`math\` - Access Math methods
- \`abs\` - Absolute value
- \`ceil\` - Round up
- \`floor\` - Round down
- \`round\` - Round nearest
- \`sqrt\` - Square root
- \`pow\` - Power

**Min/Max:**
- \`max\` - Maximum value
- \`min\` - Minimum value

**Random:**
- \`random\` - Random number
            `,
            example: `[start
    var x abs -5
    var y ceil 3.2
    var z floor 3.8
    var r round 3.5
    var sq sqrt 16
    var p pow 2 8
    var mx max 1 2 3
    var mn min 1 2 3
    var rnd random
]`
        },
        "String Keywords": {
            title: "String Operations",
            content: `
**Transformation:**
- \`toLowerCase\` - To lowercase
- \`toUpperCase\` - To uppercase
- \`trim\` - Remove whitespace

**Extraction:**
- \`substring\` - Extract substring
- \`charAt\` - Get character

**Manipulation:**
- \`split\` - Split to array
- \`replace\` - Replace substring
            `,
            example: `[start
    var str "  Hello  "
    var clean trim str
    var lower toLowerCase clean
    var upper toUpperCase clean
    var char charAt clean 0
    var sub substring clean 0 5
    var parts split clean " "
    var replaced replace clean "Hello" "Hi"
]`
        },
        "Type Keywords": {
            title: "Type Checking",
            content: `
**Type Inspection:**
- \`typeof\` - Get type name
- \`instanceof\` - Check instance
- \`isArray\` - Check if array
- \`isNaN\` - Check if NaN
- \`isFinite\` - Check if finite
            `,
            example: `[start
    var x 42
    var t typeof x
    var arr [1, 2, 3]
    var isArr isArray arr
    var nan 0 / 0
    var checkNan isNaN nan
    var inf 1 / 0
    var checkFin isFinite inf
]`
        },
        "Console Keywords": {
            title: "Console Output",
            content: `
**Output Levels:**
- \`log\` - Standard output
- \`info\` - Information
- \`warn\` - Warnings
- \`error\` - Errors
- \`debug\` - Debug info

**Special:**
- \`table\` - Table format
- \`clear\` - Clear console
            `,
            example: `[start
    log "Normal message"
    info "Info message"
    warn "Warning message"
    error "Error message"
    debug "Debug message"
    
    var data [{a: 1}, {a: 2}]
    table data
    
    clear
]`
        },
        "Module Keywords": {
            title: "Module System (Future)",
            content: `
**Import/Export:**
- \`import\` - Import module
- \`export\` - Export values
- \`from\` - Import source
- \`as\` - Import alias
- \`default\` - Default export

**Note:** Module system support is planned for future versions.
            `,
            example: `// Future syntax
export default MyClass
export var helper
import MyClass from "./module"
import { helper as h } from "./utils"`
        },
        "Class Keywords": {
            title: "Class Features",
            content: `
**Class Modifiers:**
- \`static\` - Static method/property
- \`get\` / \`getter\` - Property getter
- \`set\` / \`setter\` - Property setter
- \`extends\` - Inheritance
- \`super\` - Parent reference

**Async:**
- \`async\` - Async function
- \`await\` - Await promise
            `,
            example: `[MyClass
    [constructor
        var _value 0
    ]
    
    [getter value
        return this._value
    ]
    
    [setter value newVal
        set this._value newVal
    ]
]`
        }
    },
    
    "Advanced Topics": {
        "Best Practices": {
            title: "Coding Best Practices",
            content: `
**1. Naming Conventions:**
- Classes: PascalCase (\`MyClass\`, \`GameObject\`)
- Methods/Functions: camelCase (\`greet\`, \`updatePosition\`)
- Constants: UPPER_CASE (\`MAX_VALUE\`, \`DEFAULT_SIZE\`)

**2. Code Organization:**
- Group related methods together
- Put constructor and start at the top
- Order methods logically

**3. Comments:**
- Explain complex logic
- Document class purposes
- Note any limitations

**4. Error Handling:**
- Check for null/undefined values
- Validate input parameters
- Provide meaningful error messages

**5. Performance:**
- Avoid unnecessary object creation in loops
- Cache frequently accessed properties
- Use appropriate data structures

**6. Maintainability:**
- Keep methods focused and small
- Use descriptive variable names
- Don't repeat yourself (DRY principle)
            `,
            example: `// Good: Clear naming and structure
[UserManager
    [constructor
        var users []
        var currentUserId 0
    ]
    
    [addUser name
        // Validate input
        if !name || name == ""
            log "Error: Name required"
            return false
        ]
        
        // Create and add user
        new user User
        set user.name name
        set user.id this.currentUserId
        set this.currentUserId this.currentUserId + 1
        
        return true
    ]
]`
        },
        "Performance Tips": {
            title: "Optimization Techniques",
            content: `
**1. Loop Optimization:**
- Cache array length outside loops
- Minimize work inside loop bodies
- Use appropriate loop types

**2. Object Creation:**
- Reuse objects when possible
- Pool frequently created objects
- Initialize objects once

**3. Property Access:**
- Cache \`this\` properties in local variables
- Minimize property chain traversal
- Use local variables for repeated access

**4. Conditionals:**
- Put most likely conditions first
- Combine conditions when possible
- Use early returns

**5. String Operations:**
- Use template literals for concatenation
- Build strings in arrays then join
- Avoid repeated string modifications
            `,
            example: `[GameLoop
    [update
        // Cache array length
        var len this.objects.length
        
        // Cache this.deltaTime
        var dt this.deltaTime
        
        for let i = 0; i < len; i++
            var obj this.objects[i]
            
            // Early exit
            if !obj.active
                return
            ]
            
            // Cached property access
            var x obj.x + obj.velocity * dt
            set obj.x x
        ]
    ]
]`
        },
        "Common Patterns": {
            title: "Design Patterns",
            content: `
**1. Factory Pattern:**
Create objects without specifying exact class.

**2. Singleton Pattern:**
Ensure only one instance of a class exists.

**3. Observer Pattern:**
Objects notify subscribers of changes.

**4. Component Pattern:**
Build objects from reusable components.

**5. State Pattern:**
Change behavior based on internal state.

**6. Command Pattern:**
Encapsulate actions as objects.

These patterns help create maintainable, scalable code.
            `,
            example: `// Factory Pattern
[EntityFactory
    [createPlayer
        new player Player
        set player.health 100
        return player
    ]
    
    [createEnemy type
        new enemy Enemy
        if type == "boss"
            set enemy.health 500
        else
            set enemy.health 50
        ]
        return enemy
    ]
]

// Singleton Pattern
[GameManager
    [constructor
        var instance null
    ]
    
    [getInstance
        if this.instance == null
            new manager GameManager
            set this.instance manager
        ]
        return this.instance
    ]
]`
        },
        "Debugging Tips": {
            title: "Debugging Your Code",
            content: `
**1. Use Console Logging:**
- Log variable values at key points
- Log method entry/exit
- Log condition results

**2. Check Transpiled JavaScript:**
- Review the generated JavaScript
- Understand what your code becomes
- Learn from the transpilation

**3. Common Issues:**
- Mismatched brackets
- Incorrect keyword usage
- Wrong variable scope
- Missing \`this\` prefix

**4. Testing Strategy:**
- Test small pieces first
- Build complexity gradually
- Verify each method independently

**5. Error Messages:**
- Read error messages carefully
- Note line numbers
- Check bracket matching
- Verify keyword spelling
            `,
            example: `[DebugExample
    [problematicMethod
        log "Entering method"
        
        var x 10
        log "x = " + x
        
        if x > 5
            log "Condition true"
            set x x * 2
            log "x after multiply = " + x
        ]
        
        log "Exiting method"
        return x
    ]
]

[start
    new obj DebugExample
    var result call obj.problematicMethod
    log "Final result: " + result
]`
        }
    }
};

// Export for use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BracketScriptDocumentation;
}
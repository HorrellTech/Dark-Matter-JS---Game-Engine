class BracketScriptTranspiler {
    constructor() {
        this.classes = new Map();
        this.functions = new Map();
        this.errors = [];
        this.warnings = [];
        this.scopeStack = [];
    }

    transpile(code) {
        try {
            this.errors = [];
            this.warnings = [];

            // Normalize code
            code = this.normalizeCode(code);

            // Parse blocks
            const blocks = this.parseBlocks(code);

            // Classify blocks (class vs function)
            this.classifyBlocks(blocks);

            // Validate structure
            this.validateStructure(blocks);

            if (this.errors.length > 0) {
                return {
                    success: false,
                    error: this.errors.join('\n')
                };
            }

            // Generate JavaScript
            const jsCode = this.generateJavaScript(blocks);

            return {
                success: true,
                code: jsCode,
                warnings: this.warnings
            };
        } catch (error) {
            return {
                success: false,
                error: `Fatal Error: ${error.message}`
            };
        }
    }

    normalizeCode(code) {
        // Remove comments but preserve line breaks first
        let lines = code.split('\n');
        lines = lines.map(line => {
            // Remove line comments
            const commentIndex = line.indexOf('//');
            if (commentIndex !== -1) {
                line = line.substring(0, commentIndex);
            }
            return line;
        });
        code = lines.join('\n');
        
        // Remove block comments
        code = code.replace(/\/\*[\s\S]*?\*\//g, '');

        // Normalize whitespace while preserving strings and line structure
        let normalized = '';
        let inString = false;
        let stringChar = null;
        let lineStart = true;

        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            const prevChar = i > 0 ? code[i - 1] : '';

            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = null;
                }
            }

            if (inString) {
                normalized += char;
                lineStart = false;
            } else {
                // Outside strings
                if (char === '\n' || char === '\r') {
                    // Preserve line breaks for line-by-line parsing
                    if (normalized.length > 0 && normalized[normalized.length - 1] !== '\n') {
                        normalized += '\n';
                    }
                    lineStart = true;
                } else if (/\s/.test(char)) {
                    if (!lineStart && normalized[normalized.length - 1] !== ' ' && normalized[normalized.length - 1] !== '\n') {
                        normalized += ' ';
                    }
                } else {
                    normalized += char;
                    lineStart = false;
                }
            }
        }

        return normalized.trim();
    }

    parseBlocks(code) {
        const blocks = [];
        let depth = 0;
        let currentBlock = null;
        let blockStack = [];
        let currentContent = '';
        let i = 0;
        let inString = false;
        let stringChar = null;

        while (i < code.length) {
            const char = code[i];
            const prevChar = i > 0 ? code[i - 1] : '';

            // Track string boundaries
            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = null;
                }

                if (depth > 0) {
                    currentContent += char;
                }
            } else if (inString) {
                // Inside a string, just add the character
                if (depth > 0) {
                    currentContent += char;
                }
            } else if (char === '[') {
                if (depth === 0) {
                    // Starting a new top-level block
                    currentBlock = {
                        type: null,
                        name: null,
                        extends: null,
                        params: [],
                        content: '',
                        children: [],
                        line: this.getLineNumber(code, i)
                    };
                    blockStack = [currentBlock];
                    currentContent = '';
                } else {
                    // Nested block
                    currentContent += char;
                }
                depth++;
            } else if (char === ']') {
                depth--;
                if (depth === 0) {
                    // Closing top-level block
                    if (currentBlock) {
                        currentBlock.content = currentContent.trim();
                        this.parseBlockContent(currentBlock);
                        blocks.push(currentBlock);
                        currentBlock = null;
                        currentContent = '';
                    }
                } else {
                    currentContent += char;
                }
            } else if (depth > 0) {
                currentContent += char;
            }
            i++;
        }

        if (depth !== 0) {
            this.errors.push(`Syntax Error: Unmatched brackets. ${depth > 0 ? 'Missing closing' : 'Extra closing'} bracket(s).`);
        }

        return blocks;
    }

    parseBlockContent(block) {
        const content = block.content.trim();
        
        // Split into lines, but keep track of bracket depth
        const lines = this.splitIntoLogicalLines(content);
        
        if (lines.length === 0) return;

        // First line contains name, params, and extends
        const firstLine = lines[0];
        const parts = this.splitBySpaces(firstLine);
        
        if (parts.length === 0) return;

        block.name = parts[0];

        // Extract parameters from first line only
        let paramEndIndex = parts.length;
        const extendsIndex = parts.indexOf('extends');
        
        if (extendsIndex !== -1) {
            paramEndIndex = extendsIndex;
            block.extends = parts[extendsIndex + 1];
        }

        // Parameters are everything between name and extends/end of line (skip the name)
        block.params = parts.slice(1, paramEndIndex).filter(p => p !== 'extends');

        // Everything after the first line is nested content
        const remainingLines = lines.slice(1);
        const remainingContent = remainingLines.join('\n');
        
        block.children = this.parseNestedBlocks(remainingContent);
    }

    splitIntoLogicalLines(content) {
        // Split by newlines, but track bracket depth
        const lines = [];
        let currentLine = '';
        let depth = 0;
        let inString = false;
        let stringChar = null;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            const prevChar = i > 0 ? content[i - 1] : '';

            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = null;
                }
                currentLine += char;
            } else if (inString) {
                currentLine += char;
            } else if (char === '[') {
                depth++;
                currentLine += char;
            } else if (char === ']') {
                depth--;
                currentLine += char;
            } else if (char === '\n') {
                if (depth === 0 && currentLine.trim()) {
                    lines.push(currentLine.trim());
                    currentLine = '';
                } else {
                    currentLine += char;
                }
            } else {
                currentLine += char;
            }
        }

        if (currentLine.trim()) {
            lines.push(currentLine.trim());
        }

        return lines;
    }

    classifyBlocks(blocks) {
        for (const block of blocks) {
            if (block.name === 'start') {
                block.type = 'main';
                continue;
            }

            // Check if block has constructor or start method
            let hasConstructor = false;
            let hasProperties = false;

            for (const child of block.children) {
                if (child.name === 'constructor') {
                    hasConstructor = true;
                }
                if (child.statements) {
                    for (const stmt of child.statements) {
                        if (stmt.keyword === 'prop' || stmt.keyword === 'var') {
                            hasProperties = true;
                        }
                    }
                }
            }

            // If it has constructor or properties, it's a class
            if (hasConstructor || hasProperties || block.extends) {
                block.type = 'class';
                this.classes.set(block.name, block);
            } else {
                block.type = 'function';
                this.functions.set(block.name, block);
            }
        }
    }

    parseNestedBlocks(content) {
        const blocks = [];
        let depth = 0;
        let currentBlock = null;
        let currentContent = '';
        let i = 0;
        let inString = false;
        let stringChar = null;

        while (i < content.length) {
            const char = content[i];
            const prevChar = i > 0 ? content[i - 1] : '';

            // Track string boundaries
            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = null;
                }

                if (depth > 0) {
                    currentContent += char;
                }
            } else if (inString) {
                // Inside a string, just add the character
                if (depth > 0) {
                    currentContent += char;
                }
            } else if (char === '[') {
                if (depth === 0) {
                    currentBlock = {
                        type: null,
                        name: null,
                        params: [],
                        content: '',
                        statements: [],
                        nestedFunctions: [] // Support for nested functions
                    };
                    currentContent = '';
                } else {
                    currentContent += char;
                }
                depth++;
            } else if (char === ']') {
                depth--;
                if (depth === 0) {
                    if (currentBlock) {
                        currentBlock.content = currentContent.trim();
                        
                        // Parse first line for name and params
                        const lines = this.splitIntoLogicalLines(currentBlock.content);
                        if (lines.length > 0) {
                            const firstLine = lines[0];
                            const parts = this.splitBySpaces(firstLine);
                            
                            if (parts.length > 0) {
                                currentBlock.name = parts[0];
                                currentBlock.type = this.detectBlockType(currentBlock.name);
                                
                                // Parameters are everything after name on the first line
                                currentBlock.params = parts.slice(1);

                                // Parse statements and nested functions from remaining lines
                                const remainingLines = lines.slice(1);
                                const remainingContent = remainingLines.join('\n');
                                
                                const parsed = this.parseStatementsAndNestedBlocks(remainingContent);
                                currentBlock.statements = parsed.statements;
                                currentBlock.nestedFunctions = parsed.nestedFunctions;
                            }
                        }
                        blocks.push(currentBlock);
                        currentBlock = null;
                    }
                } else {
                    currentContent += char;
                }
            } else if (depth > 0) {
                currentContent += char;
            }
            i++;
        }

        return blocks;
    }

    parseStatementsAndNestedBlocks(content) {
        const statements = [];
        const nestedFunctions = [];
        let depth = 0;
        let inString = false;
        let stringChar = null;
        let statementContent = '';

        // First pass: separate nested blocks from statement content
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            const prevChar = i > 0 ? content[i - 1] : '';

            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = null;
                }
                if (depth === 0) {
                    statementContent += char;
                }
            } else if (inString) {
                if (depth === 0) {
                    statementContent += char;
                }
            } else if (char === '[') {
                if (depth === 0) {
                    // Mark where nested function starts
                    const funcStart = i;
                    let funcDepth = 1;
                    let funcEnd = i;

                    // Find matching closing bracket
                    for (let j = i + 1; j < content.length; j++) {
                        const c = content[j];
                        const pc = j > 0 ? content[j - 1] : '';

                        // Track strings within the function
                        if ((c === '"' || c === "'" || c === '`') && pc !== '\\') {
                            if (!inString) {
                                inString = true;
                                stringChar = c;
                            } else if (c === stringChar) {
                                inString = false;
                                stringChar = null;
                            }
                        } else if (!inString) {
                            if (c === '[') {
                                funcDepth++;
                            } else if (c === ']') {
                                funcDepth--;
                                if (funcDepth === 0) {
                                    funcEnd = j;
                                    break;
                                }
                            }
                        }
                    }

                    // Extract and parse the nested function
                    const funcContent = content.substring(funcStart, funcEnd + 1);
                    const funcBlock = this.parseNestedBlocks(funcContent)[0];
                    if (funcBlock) {
                        nestedFunctions.push(funcBlock);
                    }

                    // Skip past this function block
                    i = funcEnd;
                    inString = false;
                    stringChar = null;
                } else {
                    depth++;
                }
            } else if (char === ']') {
                if (depth > 0) {
                    depth--;
                }
            } else if (depth === 0) {
                statementContent += char;
            }
        }

        // Second pass: parse statements from the remaining content
        const tokenArray = this.tokenize(statementContent.trim());
        let ti = 0;

        while (ti < tokenArray.length) {
            const keyword = tokenArray[ti];

            if (this.isKeyword(keyword)) {
                const stmt = {
                    keyword: keyword,
                    args: []
                };

                ti++;

                // Parse arguments with operator awareness
                let currentArg = '';

                while (ti < tokenArray.length && !this.isKeyword(tokenArray[ti])) {
                    const token = tokenArray[ti];

                    // Check if this is an operator that should continue the current argument
                    if (this.isOperator(token) && currentArg) {
                        currentArg += ' ' + token;
                    } else if (this.isOperator(token) && !currentArg) {
                        // Unary operator
                        currentArg = token;
                    } else if (currentArg && this.shouldContinueArg(tokenArray[ti - 1], token)) {
                        // Continue current argument
                        currentArg += ' ' + token;
                    } else {
                        // Start new argument
                        if (currentArg) {
                            stmt.args.push(currentArg.trim());
                        }
                        currentArg = token;
                    }

                    ti++;
                }

                // Push last argument
                if (currentArg) {
                    stmt.args.push(currentArg.trim());
                }

                statements.push(stmt);
            } else {
                ti++;
            }
        }

        return { statements, nestedFunctions };
    }

    parseStatements(content) {
        return this.parseStatementsAndNestedBlocks(content).statements;
    }

    isOperator(token) {
        const operators = ['+', '-', '*', '/', '%', '==', '!=', '===', '!==',
            '<', '>', '<=', '>=', '&&', '||', '!', '&', '|', '^',
            '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '%=', '?', ':'];
        return operators.includes(token);
    }

    shouldContinueArg(prevToken, currentToken) {
        // If previous token was an operator, continue
        if (this.isOperator(prevToken)) {
            return true;
        }

        // If current token is an operator, continue
        if (this.isOperator(currentToken)) {
            return true;
        }

        // If previous token ends with . or [ continue (method chaining or array access)
        if (prevToken && (prevToken.endsWith('.') || prevToken.endsWith('['))) {
            return true;
        }

        // If current token starts with . or [ continue
        if (currentToken.startsWith('.') || currentToken.startsWith('[')) {
            return true;
        }

        return false;
    }

    tokenize(content) {
        const tokens = [];
        let current = '';
        let inString = false;
        let stringChar = null;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            const prevChar = i > 0 ? content[i - 1] : '';

            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                    current += char;
                } else if (char === stringChar) {
                    inString = false;
                    current += char;
                    stringChar = null;
                } else {
                    current += char;
                }
            } else if (inString) {
                current += char;
            } else if (char === ' ' || char === '\n') {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
            } else {
                current += char;
            }
        }

        if (current) {
            tokens.push(current);
        }

        return tokens;
    }

    splitBySpaces(content) {
        return this.tokenize(content);
    }

    isClassName(name) {
        return /^[A-Z][a-zA-Z0-9]*$/.test(name);
    }

    isMethodName(name) {
        return /^[a-z][a-zA-Z0-9]*$/.test(name);
    }

    isKeyword(word) {
        const keywords = ['prop', 'var', 'init', 'new', 'set', 'call', 'log', 'return',
            'if', 'else', 'elseif', 'while', 'for', 'each', 'in', 'func', 'extends',
            'super', 'this', 'let', 'const', 'break', 'continue', 'try', 'catch',
            'throw', 'await', 'async', 'switch', 'case', 'default', 'do',
            // Array & Object operations
            'push', 'pop', 'shift', 'unshift', 'splice', 'slice', 'concat', 'join',
            'map', 'filter', 'reduce', 'find', 'findIndex', 'includes', 'indexOf',
            'forEach', 'some', 'every', 'sort', 'reverse',
            // Object operations
            'keys', 'values', 'entries', 'assign', 'freeze', 'seal',
            // Math operations
            'math', 'abs', 'ceil', 'floor', 'round', 'max', 'min', 'random', 'sqrt', 'pow',
            // String operations
            'split', 'replace', 'trim', 'toLowerCase', 'toUpperCase', 'charAt', 'substring',
            // Type checking
            'typeof', 'instanceof', 'isArray', 'isNaN', 'isFinite',
            // Console operations
            'warn', 'error', 'info', 'debug', 'table', 'clear',
            // Control flow
            'then', 'finally', 'yield',
            // Class/Object keywords
            'static', 'get', 'getter', 'set', 'setter',
            // Export/Import (for future)
            'export', 'import', 'from', 'as', 'default',
            // Null checking
            'null', 'undefined', 'delete',
            // Advanced control
            'of', 'with', 'and', 'or'
        ];
        return keywords.includes(word);
    }

    detectBlockType(name) {
        if (name === 'constructor') return 'constructor';
        if (name === 'start') return 'start';
        if (this.isMethodName(name)) return 'method';
        return 'unknown';
    }

    validateStructure(blocks) {
        for (const block of blocks) {
            if (block.type === 'class') {
                this.validateClass(block);
            } else if (block.type === 'function') {
                this.validateFunction(block);
            }
        }
    }

    validateClass(classBlock) {
        // Check if extending a class that exists or will exist
        if (classBlock.extends && !this.classes.has(classBlock.extends) && !this.isBuiltInClass(classBlock.extends)) {
            this.warnings.push(`Warning: Class '${classBlock.name}' extends '${classBlock.extends}' which is not defined.`);
        }

        let hasConstructor = false;

        for (const child of classBlock.children) {
            if (child.type === 'constructor') {
                hasConstructor = true;
            }
        }

        if (!hasConstructor && !classBlock.extends) {
            this.warnings.push(`Warning: Class '${classBlock.name}' has no constructor.`);
        }
    }

    validateFunction(functionBlock) {
        if (functionBlock.children.length === 0) {
            this.warnings.push(`Warning: Function '${functionBlock.name}' has no body.`);
        }
    }

    isBuiltInClass(name) {
        const builtIns = ['Object', 'Array', 'String', 'Number', 'Boolean', 'Date',
            'Error', 'RegExp', 'Map', 'Set', 'Promise'];
        return builtIns.includes(name);
    }

    generateJavaScript(blocks) {
        let js = '';

        // Generate classes first
        for (const block of blocks) {
            if (block.type === 'class') {
                js += this.generateClass(block) + '\n\n';
            }
        }

        // Generate functions
        for (const block of blocks) {
            if (block.type === 'function') {
                js += this.generateFunction(block) + '\n\n';
            }
        }

        // Generate main execution
        for (const block of blocks) {
            if (block.type === 'main') {
                js += this.generateMain(block) + '\n';
            }
        }

        return js.trim();
    }

    generateClass(classBlock) {
        let extendsClause = classBlock.extends ? ` extends ${classBlock.extends}` : '';
        let js = `class ${classBlock.name}${extendsClause} {\n`;

        let properties = [];
        let constructor = null;
        let startMethod = null;
        let methods = [];

        // Categorize children
        for (const child of classBlock.children) {
            if (child.type === 'constructor') {
                constructor = child;
            } else if (child.type === 'start') {
                startMethod = child;
            } else if (child.type === 'method') {
                methods.push(child);
            }
        }

        // Generate constructor
        if (constructor || startMethod) {
            const constrCode = this.generateConstructor(constructor, startMethod, classBlock.extends);
            js += constrCode;
        }

        // Generate methods
        for (const method of methods) {
            js += '\n' + this.generateMethod(method);
        }

        js += '\n}';
        return js;
    }

    generateFunction(functionBlock) {
        const params = functionBlock.params.join(', ');
        let js = `function ${functionBlock.name}(${params}) {\n`;

        for (const child of functionBlock.children) {
            if (child.statements) {
                for (const stmt of child.statements) {
                    const line = this.generateStatement(stmt);
                    js += `    ${line}\n`;
                }
            }

            // Generate nested functions
            if (child.nestedFunctions) {
                for (const nestedFunc of child.nestedFunctions) {
                    js += this.generateNestedFunction(nestedFunc, 1);
                }
            }
        }

        js += '}';
        return js;
    }

    generateNestedFunction(funcBlock, indentLevel = 0) {
        const indent = '    '.repeat(indentLevel);
        const params = funcBlock.params.join(', ');
        let js = `${indent}function ${funcBlock.name}(${params}) {\n`;

        if (funcBlock.statements) {
            for (const stmt of funcBlock.statements) {
                const line = this.generateStatement(stmt);
                js += `${indent}    ${line}\n`;
            }
        }

        // Recursively generate nested functions
        if (funcBlock.nestedFunctions) {
            for (const nested of funcBlock.nestedFunctions) {
                js += this.generateNestedFunction(nested, indentLevel + 1);
            }
        }

        js += `${indent}}\n`;
        return js;
    }

    generateConstructor(constructor, startMethod, extendsClass) {
        let js = '    constructor() {\n';

        // If extending, call super
        if (extendsClass) {
            js += '        super();\n';
        }

        // Process constructor statements
        if (constructor) {
            for (const stmt of constructor.statements) {
                if (stmt.keyword === 'prop') {
                    const propName = stmt.args[0];
                    js += `        this.${propName} = null;\n`;
                } else if (stmt.keyword === 'var') {
                    const varName = stmt.args[0];
                    const value = stmt.args.length > 1 ? stmt.args.slice(1).join(' ') : 'null';
                    js += `        this.${varName} = ${value};\n`;
                } else {
                    const line = this.generateStatement(stmt);
                    js += `        ${line}\n`;
                }
            }
        }

        // Process start method initializations
        if (startMethod) {
            for (const stmt of startMethod.statements) {
                if (stmt.keyword === 'init') {
                    const propName = stmt.args[0];
                    const defaultVal = stmt.args[1];
                    const actualVal = stmt.args.length > 2 ? stmt.args[2] : defaultVal;

                    if (actualVal !== 'null') {
                        js += `        this.${propName} = ${actualVal};\n`;
                    }
                } else {
                    const line = this.generateStatement(stmt);
                    js += `        ${line}\n`;
                }
            }
        }

        js += '    }\n';
        return js;
    }

    generateMethod(method) {
        const params = method.params.join(', ');
        let js = `    ${method.name}(${params}) {\n`;

        for (const stmt of method.statements) {
            const line = this.generateStatement(stmt);
            js += `        ${line}\n`;
        }

        // Generate nested functions in methods
        if (method.nestedFunctions) {
            for (const nestedFunc of method.nestedFunctions) {
                js += this.generateNestedFunction(nestedFunc, 2);
            }
        }

        js += '    }\n';
        return js;
    }

    generateMain(mainBlock) {
        let js = '// Main execution\n';

        // Process all children and their statements
        for (const child of mainBlock.children) {
            if (child.statements) {
                for (const stmt of child.statements) {
                    js += this.generateStatement(stmt) + '\n';
                }
            }

            // Generate nested functions in main
            if (child.nestedFunctions) {
                for (const nestedFunc of child.nestedFunctions) {
                    js += this.generateNestedFunction(nestedFunc, 0);
                }
            }
        }

        return js;
    }

    generateStatement(stmt) {
        switch (stmt.keyword) {
            case 'new':
                const varName = stmt.args[0];
                const className = stmt.args[1];
                return `const ${varName} = new ${className}();`;

            case 'set':
                const target = stmt.args[0];
                const value = stmt.args.slice(1).join(' ');
                return `${target} = ${value};`;

            case 'call':
                // Support calling with arguments: call method arg1 arg2
                // Need to merge args that have operators between them
                const methodCall = stmt.args[0];
                let mergedArgs = [];
                
                if (stmt.args.length > 1) {
                    let currentArg = stmt.args[1];
                    
                    for (let i = 2; i < stmt.args.length; i++) {
                        const arg = stmt.args[i];
                        
                        // Check if previous arg was an operator or current is operator
                        if (this.isOperator(stmt.args[i - 1]) || this.isOperator(arg)) {
                            currentArg += ' ' + arg;
                        } else {
                            // New argument
                            mergedArgs.push(currentArg);
                            currentArg = arg;
                        }
                    }
                    
                    // Push last argument
                    if (currentArg) {
                        mergedArgs.push(currentArg);
                    }
                }
                
                // Check if method call already has parentheses
                if (methodCall.includes('(')) {
                    return `${methodCall};`;
                } else {
                    // Add arguments if provided
                    const argsString = mergedArgs.length > 0 ? mergedArgs.join(', ') : '';
                    return `${methodCall}(${argsString});`;
                }

            case 'log':
                const message = stmt.args.join(', ');
                return `console.log(${message});`;

            case 'warn':
                const warnMsg = stmt.args.join(', ');
                return `console.warn(${warnMsg});`;

            case 'error':
                const errorMsg = stmt.args.join(', ');
                return `console.error(${errorMsg});`;

            case 'info':
                const infoMsg = stmt.args.join(', ');
                return `console.info(${infoMsg});`;

            case 'debug':
                const debugMsg = stmt.args.join(', ');
                return `console.debug(${debugMsg});`;

            case 'table':
                const tableData = stmt.args.join(', ');
                return `console.table(${tableData});`;

            case 'clear':
                return `console.clear();`;

            case 'return':
                const retVal = stmt.args.join(' ');
                return `return ${retVal};`;

            case 'if':
                const condition = stmt.args.join(' ');
                return `if (${condition}) {`;

            case 'else':
                return '} else {';

            case 'elseif':
                const elseifCondition = stmt.args.join(' ');
                return `} else if (${elseifCondition}) {`;

            case 'while':
                const whileCondition = stmt.args.join(' ');
                return `while (${whileCondition}) {`;

            case 'for':
                const forCondition = stmt.args.join(' ');
                return `for (${forCondition}) {`;

            case 'each':
            case 'forEach':
                // each item in array OR forEach array
                const eachArgs = stmt.args;
                if (eachArgs.includes('in')) {
                    const inIndex = eachArgs.indexOf('in');
                    const itemVar = eachArgs[0];
                    const arrayExpr = eachArgs.slice(inIndex + 1).join(' ');
                    return `${arrayExpr}.forEach(${itemVar} => {`;
                } else {
                    const arrayExpr = eachArgs.join(' ');
                    return `${arrayExpr}.forEach(item => {`;
                }

            case 'of':
                // for of loop: of item in array
                const ofArgs = stmt.args;
                if (ofArgs.includes('in')) {
                    const inIndex = ofArgs.indexOf('in');
                    const itemVar = ofArgs[0];
                    const arrayExpr = ofArgs.slice(inIndex + 1).join(' ');
                    return `for (const ${itemVar} of ${arrayExpr}) {`;
                }
                return `// Invalid 'of' syntax`;

            case 'var':
            case 'let':
            case 'const':
                const varDecl = stmt.args[0];
                const varValue = stmt.args.length > 1 ? stmt.args.slice(1).join(' ') : 'null';
                return `${stmt.keyword} ${varDecl} = ${varValue};`;

            case 'super':
                const superCall = stmt.args.join('');
                return `super${superCall};`;

            case 'break':
                return 'break;';

            case 'continue':
                return 'continue;';

            case 'throw':
                const throwVal = stmt.args.join(' ');
                return `throw ${throwVal};`;

            case 'try':
                return 'try {';

            case 'catch':
                const catchVar = stmt.args.length > 0 ? stmt.args[0] : 'error';
                return `} catch (${catchVar}) {`;

            case 'finally':
                return '} finally {';

            // Array methods
            case 'push':
                const pushTarget = stmt.args[0];
                const pushValues = stmt.args.slice(1).join(', ');
                return `${pushTarget}.push(${pushValues});`;

            case 'pop':
                const popTarget = stmt.args[0];
                return `${popTarget}.pop();`;

            case 'shift':
                const shiftTarget = stmt.args[0];
                return `${shiftTarget}.shift();`;

            case 'unshift':
                const unshiftTarget = stmt.args[0];
                const unshiftValues = stmt.args.slice(1).join(', ');
                return `${unshiftTarget}.unshift(${unshiftValues});`;

            case 'splice':
                const spliceTarget = stmt.args[0];
                const spliceArgs = stmt.args.slice(1).join(', ');
                return `${spliceTarget}.splice(${spliceArgs});`;

            case 'slice':
                const sliceTarget = stmt.args[0];
                const sliceArgs = stmt.args.slice(1).join(', ');
                return `${sliceTarget}.slice(${sliceArgs});`;

            case 'map':
            case 'filter':
            case 'reduce':
            case 'find':
            case 'findIndex':
            case 'some':
            case 'every':
                const methodTarget = stmt.args[0];
                const callback = stmt.args.slice(1).join(' ');
                return `${methodTarget}.${stmt.keyword}(${callback});`;

            case 'sort':
                const sortTarget = stmt.args[0];
                const sortFn = stmt.args.length > 1 ? stmt.args.slice(1).join(' ') : '';
                return sortFn ? `${sortTarget}.sort(${sortFn});` : `${sortTarget}.sort();`;

            case 'reverse':
                const reverseTarget = stmt.args[0];
                return `${reverseTarget}.reverse();`;

            case 'join':
                const joinTarget = stmt.args[0];
                const joinSeparator = stmt.args.length > 1 ? stmt.args[1] : '","';
                return `${joinTarget}.join(${joinSeparator});`;

            case 'concat':
                const concatTarget = stmt.args[0];
                const concatArgs = stmt.args.slice(1).join(', ');
                return `${concatTarget}.concat(${concatArgs});`;

            case 'includes':
            case 'indexOf':
                const searchTarget = stmt.args[0];
                const searchValue = stmt.args.slice(1).join(' ');
                return `${searchTarget}.${stmt.keyword}(${searchValue});`;

            // Math operations
            case 'math':
            case 'abs':
            case 'ceil':
            case 'floor':
            case 'round':
            case 'sqrt':
            case 'max':
            case 'min':
            case 'random':
            case 'pow':
                const mathArgs = stmt.args.join(', ');
                if (stmt.keyword === 'math') {
                    // math method args -> Math.method(args)
                    const mathMethod = stmt.args[0];
                    const mathParams = stmt.args.slice(1).join(', ');
                    return `Math.${mathMethod}(${mathParams});`;
                } else if (stmt.keyword === 'random') {
                    return `Math.random();`;
                } else {
                    return `Math.${stmt.keyword}(${mathArgs});`;
                }

            // String operations
            case 'split':
            case 'replace':
            case 'trim':
            case 'toLowerCase':
            case 'toUpperCase':
            case 'charAt':
            case 'substring':
                const strTarget = stmt.args[0];
                const strArgs = stmt.args.slice(1).join(', ');
                if (stmt.keyword === 'trim' || stmt.keyword === 'toLowerCase' || stmt.keyword === 'toUpperCase') {
                    return `${strTarget}.${stmt.keyword}();`;
                } else {
                    return `${strTarget}.${stmt.keyword}(${strArgs});`;
                }

            // Type checking
            case 'typeof':
                const typeofArg = stmt.args.join(' ');
                return `typeof ${typeofArg};`;

            case 'instanceof':
                const instanceLeft = stmt.args[0];
                const instanceRight = stmt.args.slice(1).join(' ');
                return `${instanceLeft} instanceof ${instanceRight};`;

            case 'isArray':
                const isArrayArg = stmt.args.join(' ');
                return `Array.isArray(${isArrayArg});`;

            case 'isNaN':
                const isNaNArg = stmt.args.join(' ');
                return `isNaN(${isNaNArg});`;

            case 'isFinite':
                const isFiniteArg = stmt.args.join(' ');
                return `isFinite(${isFiniteArg});`;

            // Object operations
            case 'keys':
                const keysTarget = stmt.args.join(' ');
                return `Object.keys(${keysTarget});`;

            case 'values':
                const valuesTarget = stmt.args.join(' ');
                return `Object.values(${valuesTarget});`;

            case 'entries':
                const entriesTarget = stmt.args.join(' ');
                return `Object.entries(${entriesTarget});`;

            case 'assign':
                const assignArgs = stmt.args.join(', ');
                return `Object.assign(${assignArgs});`;

            case 'freeze':
                const freezeTarget = stmt.args.join(' ');
                return `Object.freeze(${freezeTarget});`;

            case 'seal':
                const sealTarget = stmt.args.join(' ');
                return `Object.seal(${sealTarget});`;

            case 'delete':
                const deleteTarget = stmt.args.join(' ');
                return `delete ${deleteTarget};`;

            case 'null':
                return 'null;';

            case 'undefined':
                return 'undefined;';

            // Comparison operators (for explicit use)
            case 'isEqual':
            case '===':
            case '==':
                return `===`;

            case 'notEqual':
            case '!==':
            case '!=':
                return `!==`;

            case 'greaterThan':
            case 'largerThan':
            case '>':
                return `>`;

            case 'lessThan':
            case 'smallerThan':
            case '<':
                return `<`;

            case 'greaterThanOrEqual':
            case '>=':
                return `>=`;

            case 'lessThanOrEqual':
            case '<=':
                return `<=`;

            case 'and':
            case '&&':
                return `&&`;

            case 'or':
            case '||':
                return `||`;

            default:
                return `// Unknown statement: ${stmt.keyword}`;
        }
    }

    getLineNumber(code, index) {
        return code.substring(0, index).split('\n').length;
    }
}
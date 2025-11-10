class JSCodeFormatter {
    constructor(options = {}) {
        this.indentSize = options.indentSize || 4;
        this.indentChar = options.indentChar || ' ';
    }

    format(code) {
        try {
            if (!code || typeof code !== 'string') {
                return code || '';
            }

            const original = code;
            code = this.normalizeLineEndings(code);
            code = this.formatCode(code);
            code = this.finalCleanup(code);

            if (!this.validateFormatting(original, code)) {
                console.warn('Formatting validation failed - returning original code');
                return original;
            }

            return code;
        } catch (error) {
            console.error('Code formatting error:', error);
            return code;
        }
    }

    formatCode(code) {
        const lines = code.split('\n');
        const formatted = [];
        let indentLevel = 0;
        let inMultiLineComment = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let trimmed = line.trim();

            // Handle empty lines
            if (trimmed === '') {
                formatted.push('');
                continue;
            }

            // Handle multi-line comments
            if (trimmed.startsWith('/*') && !trimmed.endsWith('*/')) {
                inMultiLineComment = true;
            }
            if (inMultiLineComment) {
                formatted.push(this.getIndent(indentLevel) + trimmed);
                if (trimmed.endsWith('*/')) {
                    inMultiLineComment = false;
                }
                continue;
            }

            // Handle single-line comments
            if (trimmed.startsWith('//')) {
                formatted.push(this.getIndent(indentLevel) + trimmed);
                continue;
            }

            // Count all bracket types while respecting strings
            const brackets = this.countAllBrackets(trimmed);
            
            // Calculate how many levels to dedent for closing brackets at start
            let dedent = 0;
            for (let j = 0; j < trimmed.length; j++) {
                const char = trimmed[j];
                if (char === '}' || char === ']' || char === ')') {
                    dedent++;
                } else if (char !== ' ' && char !== '\t' && char !== ';') {
                    break;
                }
            }

            // Apply dedent before formatting this line
            indentLevel = Math.max(0, indentLevel - dedent);

            // Format the line
            formatted.push(this.getIndent(indentLevel) + trimmed);

            // Calculate indent change for NEXT line
            // Add back the dedent we applied, then apply net change
            indentLevel += dedent;
            
            // Net change = (all opening brackets) - (all closing brackets)
            const totalOpen = brackets.curly.open + brackets.square.open + brackets.paren.open;
            const totalClose = brackets.curly.close + brackets.square.close + brackets.paren.close;
            indentLevel += totalOpen - totalClose;
            indentLevel = Math.max(0, indentLevel);
        }

        return formatted.join('\n');
    }

    countAllBrackets(line) {
        let curlyOpen = 0, curlyClose = 0;
        let squareOpen = 0, squareClose = 0;
        let parenOpen = 0, parenClose = 0;
        let inString = false;
        let stringChar = null;
        let escaped = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            // Track strings
            if (char === '"' || char === "'" || char === '`') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = null;
                }
                continue;
            }

            // Count all bracket types only outside strings
            if (!inString) {
                if (char === '{') curlyOpen++;
                if (char === '}') curlyClose++;
                if (char === '[') squareOpen++;
                if (char === ']') squareClose++;
                if (char === '(') parenOpen++;
                if (char === ')') parenClose++;
            }
        }

        return {
            curly: { open: curlyOpen, close: curlyClose },
            square: { open: squareOpen, close: squareClose },
            paren: { open: parenOpen, close: parenClose }
        };
    }

    normalizeLineEndings(code) {
        return code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    finalCleanup(code) {
        // Remove trailing whitespace
        code = code.split('\n')
            .map(line => line.trimEnd())
            .join('\n');

        // Reduce excessive blank lines
        code = code.replace(/\n\n\n+/g, '\n\n');

        // Ensure single newline at end
        code = code.trimEnd() + '\n';

        return code;
    }

    getIndent(level) {
        return this.indentChar.repeat(this.indentSize * Math.max(0, level));
    }

    validateFormatting(original, formatted) {
        try {
            const originalContent = original.replace(/\s+/g, '');
            const formattedContent = formatted.replace(/\s+/g, '');

            if (originalContent !== formattedContent) {
                console.error('Validation failed: Code content changed');
                console.error('Original length:', originalContent.length);
                console.error('Formatted length:', formattedContent.length);
                
                // Find first difference
                for (let i = 0; i < Math.min(originalContent.length, formattedContent.length); i++) {
                    if (originalContent[i] !== formattedContent[i]) {
                        console.error('First difference at position', i);
                        console.error('Original:', originalContent.substring(i, i + 50));
                        console.error('Formatted:', formattedContent.substring(i, i + 50));
                        break;
                    }
                }
                
                return false;
            }

            return true;
        } catch (error) {
            console.error('Validation error:', error);
            return false;
        }
    }
}
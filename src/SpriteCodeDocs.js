class SpriteCodeDocs {
  constructor(options = {}) {
    // Theme configuration - easy to modify
    this.theme = {
      // Colors
      primary: options.primaryColor || '#743ea7ff',
      primaryHover: options.primaryHoverColor || '#3c275fff',
      background: options.backgroundColor || '#1a1a2e',
      sidebarBg: options.sidebarBackground || '#0f0f23',
      textPrimary: options.textPrimary || '#d8b4fe',
      textSecondary: options.textSecondary || '#a78bfa',
      border: options.borderColor || '#6b46c1',
      hover: options.hoverColor || '#8b5cf6',

      // Sizes
      modalWidth: options.modalWidth || '90vw',
      modalHeight: options.modalHeight || '80vh',
      sidebarWidth: options.sidebarWidth || '280px',
      borderRadius: options.borderRadius || '8px',

      // Fonts
      fontFamily: options.fontFamily || 'system-ui, -apple-system, sans-serif',
      fontSize: options.fontSize || '14px'
    };

    this.isOpen = false;
    this.documentation = {};
    this.currentTopic = null;
    this.modal = null;
    this.overlay = null;

    this.init();
  }

  // Initialize the modal DOM structure
  init() {
    this.createModal();
    this.attachEvents();
  }

  // Create modal DOM elements with inline styles
  createModal() {
    //this.theme.contentBg = options.contentBg || '#181a1d'; // darker than modal background
    //this.theme.codeHighlight = options.codeHighlight || '#232a36'; // vivid for code blocks

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      backdrop-filter: blur(2px);
    `;

    // Create modal container
    this.modal = document.createElement('div');
    this.modal.style.cssText = `
      background: ${this.theme.background};
      width: ${this.theme.modalWidth};
      height: ${this.theme.modalHeight};
      max-width: 1200px;
      border-radius: ${this.theme.borderRadius};
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
      font-family: ${this.theme.fontFamily};
      font-size: ${this.theme.fontSize};
      position: relative;
      overflow: hidden;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px 20px;
      border-bottom: 1px solid ${this.theme.border};
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: ${this.theme.background};
    `;

    const title = document.createElement('h2');
    title.textContent = 'Documentation';
    title.style.cssText = `
      margin: 0;
      color: ${this.theme.textPrimary};
      font-size: 18px;
      font-weight: 600;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      color: ${this.theme.textSecondary};
      border-radius: 4px;
      transition: all 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.backgroundColor = this.theme.hover;
    closeBtn.onmouseout = () => closeBtn.style.backgroundColor = 'transparent';
    closeBtn.onclick = () => this.close();

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Create main content area
    const content = document.createElement('div');
    content.style.cssText = `
      display: flex;
      flex: 1;
      overflow: hidden;
    `;

    // Create sidebar
    const sidebar = document.createElement('div');
    sidebar.className = 'docs-sidebar';
    sidebar.style.cssText = `
      width: ${this.theme.sidebarWidth};
      background: ${this.theme.sidebarBg};
      border-right: 1px solid ${this.theme.border};
      overflow-y: auto;
      padding: 16px 0;
      -webkit-overflow-scrolling: touch;
    `;

    // Create main content
    const mainContent = document.createElement('div');
    mainContent.className = 'docs-content';
    mainContent.style.cssText = `
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      background: ${this.theme.background};
      -webkit-overflow-scrolling: touch;
    `;

    const placeholder = document.createElement('div');
    placeholder.style.cssText = `
      text-align: center;
      color: ${this.theme.textSecondary};
      font-style: italic;
      margin-top: 100px;
    `;
    placeholder.textContent = 'Select a topic to view documentation';
    mainContent.appendChild(placeholder);

    const shineStyle = document.createElement('style');
    shineStyle.textContent = `
      .shine-effect {
        position: relative;
        overflow: hidden;
      }
      .shine-effect::after {
        content: '';
        position: absolute;
        top: 0; left: -60%;
        width: 60%;
        height: 100%;
        background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
        animation: shine-move 1s linear;
        pointer-events: none;
      }
      @keyframes shine-move {
        0% { left: -60%; }
        100% { left: 120%; }
      }
    `;
    document.head.appendChild(shineStyle);

    // Add custom scrollbar styles
    const scrollbarStyle = document.createElement('style');
    scrollbarStyle.textContent = `
      .docs-sidebar::-webkit-scrollbar {
        width: 8px;
      }
      .docs-sidebar::-webkit-scrollbar-track {
        background: ${this.theme.sidebarBg};
      }
      .docs-sidebar::-webkit-scrollbar-thumb {
        background: ${this.theme.primary};
        border-radius: 4px;
      }
      .docs-sidebar::-webkit-scrollbar-thumb:hover {
        background: ${this.theme.primaryHover};
      }
      .docs-content::-webkit-scrollbar {
        width: 8px;
      }
      .docs-content::-webkit-scrollbar-track {
        background: ${this.theme.background};
      }
      .docs-content::-webkit-scrollbar-thumb {
        background: ${this.theme.primary};
        border-radius: 4px;
      }
      .docs-content::-webkit-scrollbar-thumb:hover {
        background: ${this.theme.primaryHover};
      }
    `;
    document.head.appendChild(scrollbarStyle);

    // Assemble modal
    content.appendChild(sidebar);
    content.appendChild(mainContent);
    this.modal.appendChild(header);
    this.modal.appendChild(content);
    this.overlay.appendChild(this.modal);

    document.body.appendChild(this.overlay);
  }

  // Attach event listeners
  attachEvents() {
    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  addShineEffectToTopic(topicEl) {
    // Remove previous shine if any
    topicEl.classList.remove('shine-effect');
    // Force reflow to restart animation
    void topicEl.offsetWidth;
    topicEl.classList.add('shine-effect');
  }

  // Add documentation data
  addDocumentation(category, topic, content) {
    if (!this.documentation[category]) {
      this.documentation[category] = {};
    }
    this.documentation[category][topic] = content;
    this.renderSidebar();
  }

  // Add multiple topics at once
  addCategory(category, topics) {
    this.documentation[category] = { ...this.documentation[category], ...topics };
    this.renderSidebar();
  }

  // Set complete documentation structure
  setDocumentation(docs) {
    this.documentation = docs;
    this.renderSidebar();
  }

  /**
   * Loads documentation from a JSON string.
   * @param {string} jsonString - A JSON string containing the documentation structure.
   */
  loadFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      this.setDocumentation(data);
    } catch (e) {
      console.error('Invalid JSON provided to loadFromJSON:', e);
    }
  }

  /**
   * Loads documentation from a JSON object.
   * @param {object} jsonObject - A JSON object containing the documentation structure.
   */
  loadFromJSONObject(jsonObject) {
    if (typeof jsonObject === 'object' && jsonObject !== null) {
      this.setDocumentation(jsonObject);
    } else {
      console.error('Invalid JSON object provided to loadFromJSONObject');
    }
  }

  /**
   * Loads documentation from a URL pointing to a JSON file.
   * @param {string} url - The URL of the JSON file.
   */
  async loadFromURL(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.setDocumentation(data);
    } catch (e) {
      console.error('Failed to load documentation from URL:', e);
    }
  }

  // Render the sidebar with categories and topics
  renderSidebar() {
    const sidebar = this.modal.querySelector('.docs-sidebar');
    sidebar.innerHTML = '';

    Object.keys(this.documentation).forEach(category => {
      // Collapsible category header
      const categoryHeader = document.createElement('div');
      categoryHeader.style.cssText = `
      padding: 8px 20px;
      font-weight: 600;
      color: ${this.theme.textPrimary};
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 16px;
      cursor: pointer;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;
      categoryHeader.textContent = category;

      // Arrow icon
      const arrow = document.createElement('span');
      arrow.textContent = '▶';
      arrow.style.cssText = `
      font-size: 12px;
      margin-left: 8px;
      transition: transform 0.2s;
    `;
      categoryHeader.appendChild(arrow);

      // Topics container (collapsible)
      const topicsContainer = document.createElement('div');
      topicsContainer.style.cssText = `
      display: none;
      flex-direction: column;
    `;

      // Add topics
      Object.keys(this.documentation[category]).forEach(topic => {
        const topicEl = document.createElement('div');
        topicEl.style.cssText = `
        padding: 8px 20px 8px 32px;
        cursor: pointer;
        color: ${this.theme.textSecondary};
        transition: all 0.2s;
        border-left: 3px solid transparent;
      `;
        topicEl.textContent = topic;

        topicEl.onmouseover = () => {
          topicEl.style.backgroundColor = this.theme.hover;
          topicEl.style.color = this.theme.textPrimary;
        };
        topicEl.onmouseout = () => {
          if (this.currentTopic !== `${category}-${topic}`) {
            topicEl.style.backgroundColor = 'transparent';
            topicEl.style.color = this.theme.textSecondary;
            topicEl.style.borderLeftColor = 'transparent';
          }
        };
        topicEl.onclick = () => {
          this.showTopic(category, topic);
          sidebar.querySelectorAll('div').forEach(el => {
            if (el.style.cursor === 'pointer') {
              el.style.backgroundColor = 'transparent';
              el.style.color = this.theme.textSecondary;
              el.style.borderLeftColor = 'transparent';
            }
          });
          topicEl.style.backgroundColor = this.theme.hover;
          topicEl.style.color = this.theme.primary;
          topicEl.style.borderLeftColor = this.theme.primary;
          this.currentTopic = `${category}-${topic}`;
          this.addShineEffectToTopic(topicEl);
          if (this.shineInterval) clearInterval(this.shineInterval);
          this.shineInterval = setInterval(() => {
            this.addShineEffectToTopic(topicEl);
          }, 3000);
        };
        topicsContainer.appendChild(topicEl);
      });

      // Collapse/expand logic
      categoryHeader.addEventListener('click', () => {
        const isCollapsed = topicsContainer.style.display === 'none';
        topicsContainer.style.display = isCollapsed ? 'flex' : 'none';
        arrow.style.transform = isCollapsed ? 'rotate(90deg)' : 'rotate(0deg)';
      });

      // Start collapsed
      topicsContainer.style.display = 'none';

      sidebar.appendChild(categoryHeader);
      sidebar.appendChild(topicsContainer);
    });
  }

  // Display topic content
  showTopic(category, topic) {
    const content = this.documentation[category][topic];
    const contentArea = this.modal.querySelector('.docs-content');
    contentArea.innerHTML = '';

    // Topic header
    const header = document.createElement('h1');
    header.style.cssText = `
    margin: 0 0 16px 0;
    color: ${this.theme.textPrimary};
    font-size: 24px;
    font-weight: 700;
    border-bottom: 2px solid ${this.theme.border};
    padding-bottom: 12px;
  `;
    header.textContent = topic;
    contentArea.appendChild(header);

    // Content container with rounded, darker background
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
    background: ${this.theme.contentBg || '#181a1d'};
    border-radius: 14px;
    padding: 32px 28px;
    color: ${this.theme.textPrimary};
    line-height: 1.6;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,0.12);
    margin-bottom: 24px;
    border: 1px solid ${this.theme.border};
  `;

    // Use Markdown formatting for string content
    if (typeof content === 'string') {
      contentContainer.innerHTML = this.formatDocumentation(content);
    } else if (typeof content === 'object') {
      this.renderStructuredContent(contentContainer, content);
    }

    contentArea.appendChild(contentContainer);

    // Style common HTML elements, including code blocks
    this.styleContentElements(contentContainer);

    // Trigger Prism.js syntax highlighting
    if (window.Prism && typeof window.Prism.highlightAll === 'function') {
      window.Prism.highlightAll();
    }
  }

  /**
   * Loads documentation from a Documentation class instance.
   * @param {Documentation} docInstance - Instance of Documentation.js
   */
  loadFromDocumentationClass(docInstance) {
    if (!docInstance || !docInstance.docs) return;
    Object.entries(docInstance.docs).forEach(([category, catData]) => {
      const topics = {};
      Object.entries(catData.topics).forEach(([topic, topicData]) => {
        // Use topicData.content if available, otherwise fallback to topicData
        topics[topic] = topicData.content || topicData;
      });
      this.addCategory(category, topics);
    });
  }

  // Render structured content objects
  renderStructuredContent(container, content) {
    if (content.description) {
      const desc = document.createElement('p');
      desc.innerHTML = content.description;
      container.appendChild(desc);
    }

    if (content.sections) {
      content.sections.forEach(section => {
        if (section.title) {
          const title = document.createElement('h3');
          title.textContent = section.title;
          container.appendChild(title);
        }

        if (section.content) {
          const sectionContent = document.createElement('div');
          sectionContent.innerHTML = section.content;
          container.appendChild(sectionContent);
        }
      });
    }

    if (content.examples) {
      const exampleTitle = document.createElement('h3');
      exampleTitle.textContent = 'Examples';
      container.appendChild(exampleTitle);

      content.examples.forEach(example => {
        const exampleEl = document.createElement('pre');
        exampleEl.style.cssText = `
          background: ${this.theme.sidebarBg};
          padding: 12px;
          border-radius: 4px;
          border: 1px solid ${this.theme.border};
          overflow-x: auto;
          margin: 12px 0;
        `;
        exampleEl.textContent = example;
        container.appendChild(exampleEl);
      });
    }
  }

  // Apply styles to common HTML elements
  styleContentElements(container) {
    const styles = {
      'h1, h2, h3, h4, h5, h6': `color: ${this.theme.textPrimary}; margin: 24px 0 16px 0; font-weight: 600;`,
      'p': `margin: 0 0 10px 0; line-height: 1.6; color: ${this.theme.textPrimary};`,
      'ul, ol': `margin: 0 0 10px 0; padding-left: 24px; color: ${this.theme.textPrimary};`,
      'li': `margin: 4px 0; line-height: 1.5;`,
      'code': `background: none; padding: 0; border-radius: 0; font-family: 'Monaco', 'Consolas', monospace; font-size: 13px; color: #e0eaff;`,
      // Fill the background of the code block area
      'pre': `background: ${this.theme.codeHighlight || '#232a36'}; padding: 16px 10px; border-radius: 10px; overflow-x: auto; margin: 14px 0; border: 1px solid ${this.theme.primary}; font-family: 'Monaco', 'Consolas', monospace; color: #e0eaff; width: 100%; box-sizing: border-box;`,
      '.code-line': `background: rgba(0,0,0,0.18); border: 1px solid ${this.theme.primary}; border-radius: 6px; padding: 6px 12px; margin: 2px 0; display: block; width: 100%; box-sizing: border-box; font-family: 'Monaco', 'Consolas', monospace; color: #e0eaff;`
    };

    Object.keys(styles).forEach(selector => {
      const elements = container.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.cssText += styles[selector];
      });
    });

    // Remove extra <p> tags around <pre> if present (for raw HTML)
    container.querySelectorAll('p > pre').forEach(pre => {
      const parent = pre.parentElement;
      parent.replaceWith(pre);
    });

    // For all <pre><code>, wrap each line in a .code-line span/div
    container.querySelectorAll('pre code').forEach(codeEl => {
      // Only process if not already wrapped and not Prism-highlighted
      if (!codeEl.classList.contains('code-lines-processed') &&
          !codeEl.classList.contains('language-javascript') &&
          !codeEl.classList.contains('language-json') &&
          !codeEl.classList.contains('language-css')) {
        const lines = codeEl.textContent.split('\n');
        codeEl.innerHTML = lines.map(line =>
          `<div class="code-line">${this.escapeHtml(line)}</div>`
        ).join('');
        codeEl.classList.add('code-lines-processed');
      }
    });
  }

  // Public API Methods

  // Open the modal
  open() {
    this.overlay.style.display = 'flex';
    this.isOpen = true;
    document.body.style.overflow = 'hidden';

    // Animate in
    requestAnimationFrame(() => {
      this.overlay.style.opacity = '1';
      this.modal.style.transform = 'scale(1)';
    });
  }

  // Close the modal
  close() {
    this.overlay.style.opacity = '0';
    this.modal.style.transform = 'scale(0.95)';
    if (this.shineInterval) clearInterval(this.shineInterval);
    setTimeout(() => {
      this.overlay.style.display = 'none';
      this.isOpen = false;
      document.body.style.overflow = '';
    }, 200);
  }

  // Toggle modal open/close
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  // Get current open state
  getState() {
    return {
      isOpen: this.isOpen,
      currentTopic: this.currentTopic,
      categories: Object.keys(this.documentation)
    };
  }

  // Update theme
  updateTheme(newTheme) {
    this.theme = { ...this.theme, ...newTheme };
    this.createModal();
    this.renderSidebar();
  }

  // Clear all documentation
  clearDocumentation() {
    this.documentation = {};
    this.currentTopic = null;
    this.renderSidebar();
  }

  // Remove specific category or topic
  removeDocumentation(category, topic = null) {
    if (topic) {
      if (this.documentation[category]) {
        delete this.documentation[category][topic];
        if (Object.keys(this.documentation[category]).length === 0) {
          delete this.documentation[category];
        }
      }
    } else {
      delete this.documentation[category];
    }
    this.renderSidebar();
  }

  // Auto-format documentation with simple syntax
  addFormattedDocumentation(category, topic, content) {
    const formatted = this.formatDocumentation(content);
    this.addDocumentation(category, topic, formatted);
  }

  // Add multiple formatted topics at once
  addFormattedCategory(category, topics) {
    const formattedTopics = {};
    Object.keys(topics).forEach(topic => {
      formattedTopics[topic] = this.formatDocumentation(topics[topic]);
    });
    this.addCategory(category, formattedTopics);
  }

  // Format plain text content with simple syntax rules
  formatDocumentation(content) {
    if (typeof content !== 'string') return content;

    let formatted = content;

    // Split into lines for processing
    const lines = formatted.split('\n');
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Skip empty lines (will be handled later)
      if (!line.trim()) {
        processedLines.push('');
        continue;
      }

      // Headers: # ## ### etc.
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[2];
        processedLines.push(`<h${level}>${text}</h${level}>`);
        continue;
      }

      // Code blocks: ``` language (multi-line)
      if (line.trim().startsWith('```')) {
        const language = line.trim().substring(3).trim();
        const codeLines = [];
        i++; // Move to next line

        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }

        const codeContent = codeLines.join('\n');
        if (language) {
          processedLines.push(`<pre><code class="language-${language}">${this.escapeHtml(codeContent)}</code></pre>`);
        } else {
          processedLines.push(`<pre><code>${this.escapeHtml(codeContent)}</code></pre>`);
        }
        continue;
      }

      // Lists: - or * for unordered, 1. 2. etc for ordered
      const unorderedMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
      const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);

      if (unorderedMatch || orderedMatch) {
        const isOrdered = !!orderedMatch;
        const indent = (unorderedMatch || orderedMatch)[1].length;
        const text = (unorderedMatch || orderedMatch)[2];

        // Look ahead to collect all list items
        const listItems = [{ indent, text, isOrdered }];
        let j = i + 1;

        while (j < lines.length) {
          const nextLine = lines[j];
          if (!nextLine.trim()) {
            j++;
            continue;
          }

          const nextUnordered = nextLine.match(/^(\s*)[-*]\s+(.+)$/);
          const nextOrdered = nextLine.match(/^(\s*)\d+\.\s+(.+)$/);

          if (nextUnordered || nextOrdered) {
            const nextIsOrdered = !!nextOrdered;
            const nextIndent = (nextUnordered || nextOrdered)[1].length;
            const nextText = (nextUnordered || nextOrdered)[2];
            listItems.push({ indent: nextIndent, text: nextText, isOrdered: nextIsOrdered });
            j++;
          } else {
            break;
          }
        }

        // Generate nested lists
        const listHtml = this.generateNestedList(listItems);
        processedLines.push(listHtml);
        i = j - 1; // Adjust main loop counter
        continue;
      }

      // Blockquotes: > text
      if (line.match(/^>\s+/)) {
        const quoteLines = [];
        let j = i;

        while (j < lines.length && lines[j].match(/^>\s+/)) {
          quoteLines.push(lines[j].replace(/^>\s+/, ''));
          j++;
        }

        const quoteContent = quoteLines.join('<br>');
        processedLines.push(`<blockquote>${quoteContent}</blockquote>`);
        i = j - 1;
        continue;
      }

      // Regular paragraphs
      line = this.processInlineFormatting(line);
      processedLines.push(`<p>${line}</p>`);
    }

    // Join lines and clean up multiple empty lines
    return processedLines.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  // Process inline formatting like **bold**, *italic*, `code`, [links](url)
  processInlineFormatting(text) {
    // Bold: **text** or __text__
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_ (but not if part of bold)
    text = text.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    text = text.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');

    // Inline code: `code`
    text = text.replace(/`([^`]+?)`/g, '<code>$1</code>');

    // Links: [text](url)
    text = text.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Auto-links: http://example.com or https://example.com
    text = text.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank">$1</a>');

    return text;
  }

  // Generate nested HTML lists from list items
  generateNestedList(items) {
    const result = [];
    const stack = [];

    items.forEach(item => {
      // Close lists if we're going to a lower indent level
      while (stack.length > 0 && stack[stack.length - 1].indent >= item.indent) {
        const closed = stack.pop();
        result.push(`</${closed.isOrdered ? 'ol' : 'ul'}>`);
      }

      // Open new list if needed
      if (stack.length === 0 || stack[stack.length - 1].indent < item.indent) {
        result.push(`<${item.isOrdered ? 'ol' : 'ul'}>`);
        stack.push({ indent: item.indent, isOrdered: item.isOrdered });
      }

      // Add list item
      const processedText = this.processInlineFormatting(item.text);
      result.push(`<li>${processedText}</li>`);
    });

    // Close remaining open lists
    while (stack.length > 0) {
      const closed = stack.pop();
      result.push(`</${closed.isOrdered ? 'ol' : 'ul'}>`);
    }

    return result.join('\n');
  }

  // Escape HTML characters
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

window.SpriteCodeDocs = SpriteCodeDocs;

// Example usage:
/*
const docsModal = new DocumentationModal({
  primaryColor: '#3b82f6',
  modalWidth: '85vw',
  modalHeight: '75vh'
});

// Add documentation with automatic formatting - NO HTML NEEDED!
docsModal.addFormattedDocumentation('Getting Started', 'Installation', `
# Installing the Library

To install this library, run the following command:

\`\`\`bash
npm install my-awesome-library
\`\`\`

Then import it in your project:

\`\`\`javascript
import { MyLibrary } from 'my-awesome-library';
\`\`\`

## Quick Start

1. Install the package
2. Import into your project
3. Initialize with your settings

**Important**: Make sure you have Node.js version 16 or higher.

> **Note**: This library requires modern browser support for ES6 features.

For more information, visit [our website](https://example.com).
`);

// Add multiple formatted topics at once
docsModal.addFormattedCategory('API Reference', {
  'Authentication': \`
# API Authentication

Use **Bearer tokens** for authentication with our API.

## Getting a Token

1. Sign up for an account
2. Go to your dashboard  
3. Generate an API key
4. Use it in your requests

\`\`\`javascript
const response = await fetch('/api/data', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
});
\`\`\`

*Important*: Keep your tokens secure and never expose them in client-side code.
\`,
  
  'Rate Limits': \`
# Rate Limiting

Our API has the following rate limits:

- **Free tier**: 100 requests per hour
- **Pro tier**: 1000 requests per hour  
- **Enterprise**: Unlimited

## Handling Rate Limits

When you exceed the rate limit, you'll receive a \`429\` status code:

\`\`\`json
{
  "error": "Rate limit exceeded",
  "retry_after": 3600
}
\`\`\`

> **Tip**: Implement exponential backoff in your retry logic.
\`
});

// Open the modal
docsModal.open();
*/
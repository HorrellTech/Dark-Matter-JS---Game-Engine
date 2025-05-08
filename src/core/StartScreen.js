class StartScreen {
    constructor(version = '0.1.0') {
        this.version = version;
        this.container = null;
        this.updates = [
            {
                version: 'v0.1.0',
                date: 'May 8, 2025',
                changes: [
                    'Initial release with basic editor functionality',
                    'Scene editing with transform controls',
                    'Module system for component-based architecture',
                    'File browser for project management',
                    'Built-in script editor with syntax highlighting'
                ]
            },
            {
                version: 'v0.0.2',
                date: 'April 25, 2025',
                changes: [
                    'Added SpriteRenderer module',
                    'Implemented hierarchy drag and drop',
                    'Added inspector panel with property editing',
                    'Scene serialization and loading',
                    'Grid snapping and viewport controls'
                ]
            },
            {
                version: 'v0.0.1',
                date: 'April 10, 2025',
                changes: [
                    'Project scaffolding',
                    'Basic UI layout',
                    'Canvas rendering system',
                    'Basic game object management'
                ]
            }
        ];
        
        // Show the start screen only if user hasn't chosen to skip it
        if (!this.shouldSkipStartScreen()) {
            this.createModal();
        }
    }
    
    shouldSkipStartScreen() {
        return localStorage.getItem('skipStartScreen') === 'true';
    }
    
    createModal() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'start-screen-overlay';
        
        // Create content
        const content = document.createElement('div');
        content.className = 'start-screen-content';
        
        // Add header with logo
        content.innerHTML = `
            <div class="start-screen-header">
                <img src="logo.png" alt="Dark Matter JS" class="start-screen-logo" onerror="this.src='assets/logo-placeholder.png'; this.onerror='';">
                <h1 class="start-screen-title">Dark Matter JS</h1>
                <div class="start-screen-version">Version ${this.version}</div>
            </div>
            
            <div class="start-screen-body">
                <div class="start-screen-updates">
                    <h3>What's New</h3>
                    ${this.generateUpdatesList()}
                </div>
                
                <div class="start-screen-actions">
                    <h3>Quick Actions</h3>
                    <button class="action-button primary" id="newProject">
                        <i class="fas fa-file"></i> New Project
                    </button>
                    <button class="action-button" id="openProject">
                        <i class="fas fa-folder-open"></i> Open Project
                    </button>
                    <button class="action-button" id="showDocs">
                        <i class="fas fa-book"></i> Documentation
                    </button>
                    <button class="action-button" id="showTutorials">
                        <i class="fas fa-graduation-cap"></i> Tutorials
                    </button>
                </div>
            </div>
            
            <div class="start-screen-footer">
                <div class="start-screen-checkbox">
                    <input type="checkbox" id="dontShowAgain">
                    <label for="dontShowAgain">Don't show at startup</label>
                </div>
                <button class="start-button">Get Started</button>
            </div>
        `;
        
        // Add content to container
        this.container.appendChild(content);
        document.body.appendChild(this.container);
        
        // Add event listeners
        this.setupEventListeners();
    }
    
    generateUpdatesList() {
        return this.updates.map(update => `
            <div class="update-item">
                <div class="update-version">${update.version}</div>
                <div class="update-date">${update.date}</div>
                <div class="update-changes">
                    <ul>
                        ${update.changes.map(change => `<li>${change}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
    }
    
    setupEventListeners() {
        // Get elements
        const closeButton = this.container.querySelector('.start-button');
        const dontShowCheckbox = this.container.querySelector('#dontShowAgain');
        const newProjectButton = this.container.querySelector('#newProject');
        const openProjectButton = this.container.querySelector('#openProject');
        const docsButton = this.container.querySelector('#showDocs');
        const tutorialsButton = this.container.querySelector('#showTutorials');
        
        // Close button
        closeButton.addEventListener('click', () => {
            if (dontShowCheckbox.checked) {
                localStorage.setItem('skipStartScreen', 'true');
            }
            this.close();
        });
        
        // New Project button
        newProjectButton.addEventListener('click', () => {
            this.close();
            // You can implement new project functionality here or call an existing method
            console.log('New project clicked');
        });
        
        // Open Project button
        openProjectButton.addEventListener('click', () => {
            this.close();
            // You can implement open project functionality here or call an existing method
            console.log('Open project clicked');
        });
        
        // Documentation button
        docsButton.addEventListener('click', () => {
            this.showDocumentation();
        });
        
        // Tutorials button
        tutorialsButton.addEventListener('click', () => {
            this.showTutorials();
        });
    }
    
    close() {
        // Add closing animation
        this.container.style.animation = 'fadeOut 0.3s forwards';
        
        // Remove from DOM after animation completes
        setTimeout(() => {
            if (this.container && this.container.parentElement) {
                this.container.parentElement.removeChild(this.container);
            }
        }, 300);
    }
    
    showDocumentation() {
        // Documentation modal implementation
        const docsModal = new DocumentationModal();
        docsModal.show();
    }
    
    showTutorials() {
        // Tutorials modal implementation
        alert('Tutorials coming soon');
        // This would be replaced with actual tutorials modal
    }
}
class StartScreen {
    constructor(version = '0.3.0') {
        this.version = version;
        this.container = null;
        this.updates = [
            
            {
                version: 'v0.3.1',
                date: 'October 19, 2025',
                changes: [
                    'Improve AI prompting for module creation',
                    'Add code property for custom scripts in modules',
                    'Fix various bugs',
                    'Update documentation with new features'
                ]
            },
            {
                version: 'v0.3.0',
                date: 'October 19, 2025',
                changes: [
                    'Added link to Community Forums',
                    'Added Asset Manager Window for managing built in assets',
                    'Added Sprite Sheet Renderer',
                    'Added Spline Path module for creating spline paths',
                    'Added PuddleLake module for water effects',
                    'Improved performance of the editor and runtime',
                    'Fixed various bugs',
                    'Updated documentation with new features and modules'
                ]
            },
            {
                version: 'v0.2.5',
                date: 'August 26, 2025',
                changes: [
                    'Added BasicPhysics module for simple physics simulation',
                    'Added SpriteCode tool to create modules from drawing shapes',
                    'Improved Inspector styling and usability',
                    'Added MatterMath for useful math functions',
                    'Added ParticleSystem module for particle effects',
                    'Fix HTML5 export issues with some browsers',
                    'Various bug fixes and performance improvements',
                    'Updated documentation with new modules and features'
                ]
            },
            {
                version: 'v0.2.0',
                date: 'July 26, 2025',
                changes: [
                    'Added comprehensive Keywords documentation with all modules',
                    'Integrated AudioPlayer module for advanced audio playback',
                    'Added BehaviorTrigger for visual scripting without code',
                    'Implemented SimpleHealth system for damage and health',
                    'Added CameraController with smooth following and shake effects',
                    'New KeyboardController and SimpleMovementController modules',
                    'Drawing modules: DrawCircle, DrawRectangle, DrawPolygon',
                    'Enhanced SpriteRenderer with multiple scaling modes',
                    'Added SpriteSheetRenderer for sprite sheet animations',
                    'Matter.js physics integration with RigidBody and Collider',
                    'BoundingBoxCollider for custom collision boundaries',
                    'Updated documentation modal with Keywords reference section'
                ]
            },
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
                <!--h1 class="start-screen-title">Dark Matter JS</h1>
                <div class="start-screen-version">Version ${this.version}</div-->
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

        // Touch support for buttons (ensures tap works on mobile)
        [closeButton, newProjectButton, openProjectButton, docsButton, tutorialsButton].forEach(btn => {
            if (btn) {
                btn.addEventListener('touchend', e => {
                    // Only trigger if it's a tap (not a drag)
                    if (e.changedTouches.length === 1) {
                        btn.click();
                    }
                }, { passive: true });
            }
        });

        // Swipe down to close modal (optional, UX improvement)
        let touchStartY = null;
        this.container.addEventListener('touchstart', e => {
            if (e.touches.length === 1) {
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        this.container.addEventListener('touchend', e => {
            if (touchStartY !== null && e.changedTouches.length === 1) {
                const touchEndY = e.changedTouches[0].clientY;
                if (touchEndY - touchStartY > 80) { // Swipe down threshold
                    this.close();
                }
                touchStartY = null;
            }
        }, { passive: true });
        
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
        if (window.docsModal) {
            console.log('Documentation button clicked');
            const documentation = new Documentation();
            window.docsModal.loadFromDocumentationClass(documentation);
            //window.docModal.open();
            //const docsModal = new Documentation();
            //docsModal.show();
            //window.docsModal.open();
        } else {
            console.warn("Documentation button or modal not found. Creating it!");
            window.docsModal = new SpriteCodeDocs();
            const documentation = new Documentation();
            window.docsModal.loadFromDocumentationClass(documentation);
            //window.docsModal.open();
        }
    }
    
    showTutorials() {
        // Tutorials modal implementation
        alert('Tutorials coming soon');
        // This would be replaced with actual tutorials modal
    }
}
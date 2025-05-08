class DocumentationModal {
    constructor() {
        this.container = null;
    }
    
    show() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'documentation-modal start-screen-overlay';
        
        // Create content
        const content = document.createElement('div');
        content.className = 'start-screen-content documentation-content';
        
        content.innerHTML = `
            <div class="start-screen-header">
                <h1 class="start-screen-title">Documentation</h1>
            </div>
            
            <div class="documentation-body" style="padding: 20px; overflow-y: auto; max-height: 70vh;">
                <h2>Dark Matter JS Documentation</h2>
                <p>This documentation will guide you through using the Dark Matter JS Game Engine.</p>
                
                <h3>Getting Started</h3>
                <p>To create a new game project:</p>
                <ol>
                    <li>Click the "New Project" button in the toolbar</li>
                    <li>Set up your project settings</li>
                    <li>Start adding game objects to your scene</li>
                </ol>
                
                <h3>Basic Concepts</h3>
                <p>Dark Matter JS uses a component-based architecture:</p>
                <ul>
                    <li><strong>GameObjects</strong>: The base entities in your game</li>
                    <li><strong>Modules</strong>: Components that add behavior and properties to GameObjects</li>
                    <li><strong>Scenes</strong>: Collections of GameObjects that form a level or screen</li>
                </ul>
                
                <h3>Coming Soon</h3>
                <p>Full documentation is under development and will be included in future updates.</p>
            </div>
            
            <div class="start-screen-footer">
                <div></div>
                <button class="start-button">Close</button>
            </div>
        `;
        
        // Add content to container
        this.container.appendChild(content);
        document.body.appendChild(this.container);
        
        // Add event listener to close button
        const closeButton = this.container.querySelector('.start-button');
        closeButton.addEventListener('click', () => this.close());
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
}
/**
 * ForumWindow - An EditorWindow for viewing the DarkMatter.js Flarum forum
 * 
 * This window embeds the DarkMatter.js Flarum forum in an iframe,
 * providing a convenient way to access the community directly from the editor.
 */
class ForumWindow extends EditorWindow {
    constructor() {
        super("DarkMatter.js Forum", {
            width: 1200,
            height: 800,
            resizable: true,
            modal: false,
            closable: true,
            className: 'forum-window'
        });

        this.forumUrl = 'https://darkmatterjsforum.flarum.cloud/';
        this.setupUI();
    }

    /**
     * Setup the forum UI
     */
    setupUI() {
        // Clear default content
        this.clearContent();

        // Create toolbar
        const toolbar = this.createToolbar();
        this.content.appendChild(toolbar);

        // Create iframe container
        const iframeContainer = document.createElement('div');
        iframeContainer.style.cssText = `
            flex: 1;
            position: relative;
            width: 100%;
            height: calc(100% - 50px);
            background: #1e1e1e;
        `;

        // Create loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #fff;
            font-size: 14px;
            text-align: center;
        `;
        loadingIndicator.innerHTML = `
            <div style="margin-bottom: 12px;">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid #333;
                    border-top-color: #0078d4;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                "></div>
            </div>
            <div>Loading forum...</div>
        `;

        // Add spinning animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        iframeContainer.appendChild(loadingIndicator);

        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.src = this.forumUrl;
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            background: white;
            display: none;
        `;

        // Handle iframe load
        iframe.onload = () => {
            loadingIndicator.style.display = 'none';
            iframe.style.display = 'block';
        };

        // Handle iframe error
        iframe.onerror = () => {
            loadingIndicator.innerHTML = `
                <div style="color: #ff6b6b;">
                    <div style="font-size: 32px; margin-bottom: 8px;">⚠</div>
                    <div>Failed to load forum</div>
                    <button onclick="location.reload()" style="
                        margin-top: 12px;
                        padding: 8px 16px;
                        background: #0078d4;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Retry</button>
                </div>
            `;
        };

        iframeContainer.appendChild(iframe);
        this.content.appendChild(iframeContainer);

        // Store references
        this.iframe = iframe;
        this.loadingIndicator = loadingIndicator;

        // Adjust content styles
        this.content.style.cssText = `
            flex: 1;
            padding: 0;
            overflow: hidden;
            background: #1e1e1e;
            color: #ffffff;
            display: flex;
            flex-direction: column;
        `;
    }

    /**
     * Create toolbar with navigation controls
     */
    createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'forum-toolbar';
        toolbar.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: #2d2d2d;
            border-bottom: 1px solid #555;
            height: 50px;
            box-sizing: border-box;
        `;

        // Back button
        const backBtn = this.createToolbarButton('←', 'Go back', () => {
            if (this.iframe.contentWindow) {
                this.iframe.contentWindow.history.back();
            }
        });
        //toolbar.appendChild(backBtn);

        // Forward button
        const forwardBtn = this.createToolbarButton('→', 'Go forward', () => {
            if (this.iframe.contentWindow) {
                this.iframe.contentWindow.history.forward();
            }
        });
        //toolbar.appendChild(forwardBtn);

        // Refresh button
        const refreshBtn = this.createToolbarButton('⟳', 'Refresh', () => {
            this.iframe.src = this.iframe.src;
        });
        toolbar.appendChild(refreshBtn);

        // Home button
        const homeBtn = this.createToolbarButton('⌂', 'Home', () => {
            this.iframe.src = this.forumUrl;
        });
        toolbar.appendChild(homeBtn);

        // Separator
        const separator = document.createElement('div');
        separator.style.cssText = `
            width: 1px;
            height: 24px;
            background: #555;
            margin: 0 4px;
        `;
        toolbar.appendChild(separator);

        // URL display (read-only)
        const urlDisplay = document.createElement('div');
        urlDisplay.style.cssText = `
            flex: 1;
            padding: 6px 12px;
            background: #1e1e1e;
            border: 1px solid #555;
            border-radius: 4px;
            color: #aaa;
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;
        urlDisplay.textContent = this.forumUrl;
        toolbar.appendChild(urlDisplay);

        // Open in new tab button
        const newTabBtn = this.createToolbarButton('⧉', 'Open in new tab', () => {
            window.open(this.forumUrl, '_blank');
        });
        toolbar.appendChild(newTabBtn);

        return toolbar;
    }

    /**
     * Create a toolbar button
     */
    createToolbarButton(text, title, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.title = title;
        button.style.cssText = `
            width: 32px;
            height: 32px;
            border: none;
            background: #3d3d3d;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: background 0.2s;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.background = '#4d4d4d';
        });

        button.addEventListener('mouseleave', () => {
            button.style.background = '#3d3d3d';
        });

        button.addEventListener('click', onClick);

        return button;
    }

    /**
     * Override onShow to ensure iframe is loaded
     */
    onShow() {
        super.onShow();
        
        // If iframe hasn't loaded yet, show loading indicator
        if (!this.iframe.contentDocument || this.iframe.contentDocument.readyState !== 'complete') {
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'block';
            }
        }
    }

    /**
     * Override serialize to include forum-specific data
     */
    serialize() {
        const data = super.serialize();
        data.forumUrl = this.forumUrl;
        return data;
    }

    /**
     * Override deserialize to restore forum-specific data
     */
    deserialize(data) {
        super.deserialize(data);
        if (data.forumUrl) {
            this.forumUrl = data.forumUrl;
            if (this.iframe) {
                this.iframe.src = this.forumUrl;
            }
        }
    }
}

// Make it available globally
window.ForumWindow = ForumWindow;

/*window.addEventListener('load', () => {
    // Wait a bit for FileBrowser to initialize
    setTimeout(() => {
        if (window.fileBrowser && window.fileBrowser.registerEditorWindow) {
            window.fileBrowser.registerEditorWindow(ForumWindow);
        }
    }, 1000);
});

// Also try to register when FileBrowser becomes available
Object.defineProperty(window, 'fileBrowser', {
    set: function (value) {
        this._fileBrowser = value;
        if (value && value.registerEditorWindow) {
            setTimeout(() => {
                value.registerEditorWindow(ForumWindow);
            }, 100);
        }
    },
    get: function () {
        return this._fileBrowser;
    }
});*/
if (!window.DarkMatterDocs) {
    console.error('DarkMatterDocs not found! Make sure Keywords.js is loaded first.');
}

class DocumentationModal {
    constructor() {
        this.isOpen = false;
        this.searchTerm = '';
        this.selectedGroup = 'all';
        this.createModal();
        this.setupEventListeners();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'doc-modal';
        this.modal.innerHTML = `
            <div class="doc-modal-content">
                <div class="doc-modal-header">
                    <div class="doc-modal-title">
                        <i class="fas fa-book"></i>
                        Dark Matter JS Documentation
                    </div>
                    <div class="doc-modal-close"><i class="fas fa-times"></i></div>
                </div>
                <div class="doc-modal-search">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Search documentation...">
                    </div>
                    <div class="group-filter">
                        <select id="docGroupFilter">
                            <option value="all">All Groups</option>
                        </select>
                    </div>
                </div>
                <div class="doc-modal-body">
                    <div class="doc-sidebar"></div>
                    <div class="doc-content">
                        <div class="doc-welcome">
                            <h2>Welcome to Dark Matter JS Documentation</h2>
                            <p>Select a category or search for specific functionality.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
    }

    setupEventListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('.doc-modal-close');
        closeBtn.addEventListener('click', () => this.close());
        closeBtn.addEventListener('touchstart', () => this.close());

        // Search input
        const searchInput = this.modal.querySelector('.search-box input');
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.refreshContent();
        });

        // Group filter
        const groupFilter = this.modal.querySelector('#docGroupFilter');
        groupFilter.addEventListener('change', (e) => {
            this.selectedGroup = e.target.value;
            this.refreshContent();
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Close on outside click/touch
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
        this.modal.addEventListener('touchstart', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }

    populateGroups() {
        const groups = window.getDocumentationGroups();
        const select = this.modal.querySelector('#docGroupFilter');
        
        // Clear existing options except "All Groups"
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add groups
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            select.appendChild(option);
        });
    }

    refreshContent() {
        const sidebar = this.modal.querySelector('.doc-sidebar');
        sidebar.innerHTML = '';

        // Get all functions for current group/search
        let functions = [];
        if (this.selectedGroup === 'all') {
            const groups = window.getDocumentationGroups();
            groups.forEach(group => {
                functions = functions.concat(window.getFunctionsByGroup(group));
            });
        } else {
            functions = window.getFunctionsByGroup(this.selectedGroup);
        }

        // Filter by search term
        if (this.searchTerm) {
            functions = functions.filter(func => 
                func.name.toLowerCase().includes(this.searchTerm) ||
                func.description.toLowerCase().includes(this.searchTerm)
            );
        }

        // Group functions by category
        const categories = {};
        functions.forEach(func => {
            if (!categories[func.category]) {
                categories[func.category] = [];
            }
            categories[func.category].push(func);
        });

        // Create sidebar items
        Object.entries(categories).forEach(([category, funcs]) => {
            const categoryEl = document.createElement('div');
            categoryEl.className = 'doc-category';
            categoryEl.innerHTML = `
                <div class="doc-category-header">
                    <i class="fas fa-folder"></i> ${category}
                </div>
                <div class="doc-category-items"></div>
            `;

            const itemsContainer = categoryEl.querySelector('.doc-category-items');
            funcs.forEach(func => {
                const item = document.createElement('div');
                item.className = 'doc-item';
                item.textContent = func.name;
                item.addEventListener('click', () => this.showFunctionDetails(func));
                item.addEventListener('touchstart', () => this.showFunctionDetails(func));
                itemsContainer.appendChild(item);
            });

            sidebar.appendChild(categoryEl);
        });

        // Show empty state if no results
        if (Object.keys(categories).length === 0) {
            sidebar.innerHTML = `
                <div class="doc-empty-state">
                    <i class="fas fa-search"></i>
                    <p>No matching functions found</p>
                </div>
            `;
        }
    }

    showFunctionDetails(func) {
        const content = this.modal.querySelector('.doc-content');
        
        content.innerHTML = `
            <div class="doc-function-details">
                <h2>${func.name}</h2>
                <div class="doc-tags">
                    <span class="doc-tag category">${func.category}</span>
                    <span class="doc-tag group">${DarkMatterDocs[func.category].group}</span>
                </div>
                <div class="doc-description">${func.description}</div>
                
                ${func.params ? `
                    <div class="doc-section">
                        <h3>Parameters</h3>
                        <div class="doc-params">
                            ${func.params.map(param => `
                                <div class="doc-param">
                                    <span class="param-name">${param.name}</span>
                                    <span class="param-type">${param.type}</span>
                                    <span class="param-desc">${param.description}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${func.returns ? `
                    <div class="doc-section">
                        <h3>Returns</h3>
                        <div class="doc-return">
                            <span class="return-type">${func.returns.type}</span>
                            <span class="return-desc">${func.returns.description}</span>
                        </div>
                    </div>
                ` : ''}
                
                <div class="doc-section">
                    <h3>Example</h3>
                    <pre class="doc-example"><code>${func.example}</code></pre>
                </div>
            </div>
        `;
    }

    open() {
        console.log('Opening modal');
        this.modal.classList.add('visible');
        this.isOpen = true;
        this.populateGroups();
        this.refreshContent();
    }

    close() {
        console.log('Closing modal');
        this.modal.classList.remove('visible');
        this.isOpen = false;
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
}

// Create global instance
window.DocumentationModal = DocumentationModal;
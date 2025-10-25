/**
 * AssetManagerWindow - Built-in asset browser and importer
 * 
 * Scans for .dmjs files in the src/assets directory and allows users to import them
 * into their project's file browser.
 */
class AssetManagerWindow extends EditorWindow {
    static icon = "fa-download";
    static color = "#28a745";
    static description = "Import built-in assets into your project";

    constructor() {
        super("Asset Manager", {
            width: 800,
            height: 600,
            resizable: true,
            modal: false,
            className: 'asset-manager-window'
        });

        this.knownAssets = [
            'sprite_sheet_animation_tool.dmjs',
            'texture_generator_tool.dmjs',
            'basic_drawing_module.dmjs',
            'marching_squares.dmjs',
            'infinite_2d_parallax_starfield.dmjs',
            'top_down_cars_and_road_cone.dmjs',
            'asteroids.dmjs',
            '2d_context_3d.dmjs',
            'matter_js.dmjs',
            'puddle_lake_generator.dmjs',
            'splines.dmjs',
            'platformer_procedurally_generated.dmjs',
            'object_visual_effects.dmjs',
            'dialog_system_editor.dmjs'
            // Add more known asset filenames here
        ];

        this.assetsPath = 'src/Assets/';
        this.availableAssets = [];
        this.selectedAssets = new Set();
        this.isLoading = false;

        this.setupUI();
        this.scanForAssets();
    }

    setupUI() {
        // Clear any existing content
        this.clearContent();

        // Create header section with scan button
        const headerSection = document.createElement('div');
        headerSection.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #555;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Built-in Assets';
        title.style.cssText = `
            margin: 0;
            color: #ffffff;
            font-size: 16px;
        `;

        const refreshBtn = this.addButton('refreshAssets', 'Refresh', {
            onClick: () => this.scanForAssets(),
            style: `
                background: #28a745;
                margin: 0;
                padding: 6px 12px;
                font-size: 12px;
            `
        });

        headerSection.appendChild(title);
        headerSection.appendChild(refreshBtn);
        this.addContent(headerSection);

        // Create loading indicator
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.style.cssText = `
            text-align: center;
            padding: 20px;
            color: #aaa;
            display: none;
        `;
        this.loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning for assets...';
        this.addContent(this.loadingIndicator);

        // Create assets list container
        this.assetsList = document.createElement('div');
        this.assetsList.className = 'assets-list';
        this.assetsList.style.cssText = `
            flex: 1;
            overflow-y: auto;
            border: 1px solid #555;
            border-radius: 4px;
            background: #2a2a2a;
            max-height: 400px;
        `;
        this.addContent(this.assetsList);

        // Create footer with import controls
        const footerSection = document.createElement('div');
        footerSection.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid #555;
        `;

        const selectionInfo = document.createElement('span');
        selectionInfo.className = 'selection-info';
        selectionInfo.style.cssText = `
            color: #aaa;
            font-size: 12px;
        `;
        this.selectionInfo = selectionInfo;

        const buttonGroup = document.createElement('div');
        buttonGroup.style.cssText = 'display: flex; gap: 8px;';

        const selectAllBtn = this.addButton('selectAll', 'Select All', {
            onClick: () => this.selectAllAssets(),
            style: `
                background: #6c757d;
                margin: 0;
                padding: 6px 12px;
                font-size: 12px;
            `
        });

        const deselectAllBtn = this.addButton('deselectAll', 'Deselect All', {
            onClick: () => this.deselectAllAssets(),
            style: `
                background: #6c757d;
                margin: 0;
                padding: 6px 12px;
                font-size: 12px;
            `
        });

        const importBtn = this.addButton('importAssets', 'Import Selected', {
            onClick: () => this.importSelectedAssets(),
            style: `
                background: #007bff;
                margin: 0;
                padding: 6px 16px;
                font-size: 12px;
                font-weight: bold;
            `
        });

        buttonGroup.appendChild(selectAllBtn);
        buttonGroup.appendChild(deselectAllBtn);
        buttonGroup.appendChild(importBtn);

        footerSection.appendChild(selectionInfo);
        footerSection.appendChild(buttonGroup);
        this.addContent(footerSection);

        this.updateSelectionInfo();
    }

    async scanForAssets() {
        this.isLoading = true;
        this.showLoading(true);
        this.availableAssets = [];

        try {
            // Try to scan real assets directory first
            await this.scanRealAssetsDirectory();

            // If no real assets found, fall back to examples
            //if (this.availableAssets.length === 0) {
            //await this.simulateAssetScan();
            //}

            this.renderAssetsListToUI();
        } catch (error) {
            console.error('Error scanning for assets:', error);
            // Fall back to simulated assets on error
            await this.simulateAssetScan();
            this.renderAssetsListToUI();
            this.showWarning('Could not scan assets directory, showing examples');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    async simulateAssetScan() {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Example assets that would be found
        this.availableAssets = [
            {
                name: 'Player Character',
                filename: 'player-character.dmjs',
                description: 'Basic player character with movement and animation',
                type: 'prefab',
                size: '2.4 KB',
                icon: 'fa-user'
            },
            {
                name: 'Basic Enemies Pack',
                filename: 'basic-enemies.dmjs',
                description: 'Collection of simple enemy prefabs',
                type: 'asset-pack',
                size: '5.7 KB',
                icon: 'fa-skull'
            },
            {
                name: 'UI Elements',
                filename: 'ui-elements.dmjs',
                description: 'Common UI components and buttons',
                type: 'ui-pack',
                size: '3.2 KB',
                icon: 'fa-window-restore'
            },
            {
                name: 'Particle Effects',
                filename: 'particle-effects.dmjs',
                description: 'Fire, smoke, and explosion effects',
                type: 'effects',
                size: '4.1 KB',
                icon: 'fa-fire'
            },
            {
                name: 'Audio Manager',
                filename: 'audio-manager.dmjs',
                description: 'Complete audio system with mixing',
                type: 'system',
                size: '8.3 KB',
                icon: 'fa-volume-up'
            }
        ];
    }

    renderAssetsListToUI() {
        // Clear existing content
        this.assetsList.innerHTML = '';

        if (this.availableAssets.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.style.cssText = `
                text-align: center;
                padding: 40px 20px;
                color: #aaa;
                font-size: 14px;
            `;
            emptyMessage.innerHTML = `
                <i class="fas fa-box-open" style="font-size: 48px; margin-bottom: 16px; display: block; color: #666;"></i>
                <p>No asset packages found</p>
                <p style="font-size: 12px;">Place .dmjs files in the src/Assets/ directory</p>
            `;
            this.assetsList.appendChild(emptyMessage);
            this.updateSelectionInfo();
            return;
        }

        // Render each asset using the enhanced createAssetItem method
        this.availableAssets.forEach((asset, index) => {
            const assetItem = this.createAssetItem(asset, index);
            this.assetsList.appendChild(assetItem);
        });

        this.updateSelectionInfo();
    }

    renderAssetsList(assets, container) {
        if (!assets || !container) {
            console.warn('renderAssetsList called without proper parameters');
            return;
        }

        assets.forEach(asset => {
            const assetItem = document.createElement('div');
            assetItem.style.cssText = `
            display: flex;
            align-items: center;
            padding: 8px 12px;
            border-bottom: 1px solid #333;
            font-size: 13px;
        `;

            const icon = this.getAssetIcon(asset.type);

            assetItem.innerHTML = `
            <i class="fas ${icon}" style="margin-right: 8px; color: #FF9800; width: 16px;"></i>
            <span style="color: #fff; flex: 1;">${asset.name}</span>
            <span style="color: #666; font-size: 11px;">${asset.type}</span>
        `;

            container.appendChild(assetItem);
        });
    }

    getFileIcon(filePath) {
        const ext = filePath.split('.').pop().toLowerCase();
        const iconMap = {
            'js': 'fa-file-code',
            'json': 'fa-file-code',
            'png': 'fa-image', 'jpg': 'fa-image', 'jpeg': 'fa-image', 'gif': 'fa-image',
            'mp3': 'fa-music', 'wav': 'fa-music', 'ogg': 'fa-music',
            'txt': 'fa-file-alt',
            'md': 'fa-file-alt'
        };
        return iconMap[ext] || 'fa-file';
    }

    getAssetIcon(assetType) {
        const iconMap = {
            'image': 'fa-image',
            'script': 'fa-file-code',
            'prefab': 'fa-cube',
            'scene': 'fa-gamepad',
            'audio': 'fa-music',
            'ui-pack': 'fa-window-restore',
            'effects': 'fa-fire',
            'system': 'fa-cogs'
        };
        return iconMap[assetType] || 'fa-file';
    }

    async previewAssetPackage(asset, index) {
        try {
            const content = await this.loadAssetContent(asset.filename);
            const packageData = JSON.parse(content);

            // Create preview modal
            this.showPackagePreview(asset, packageData);
        } catch (error) {
            console.error('Error loading package for preview:', error);
            this.showError('Failed to load package preview');
        }
    }

    showImageModal(imageSrc, imageName = 'Asset Image') {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            cursor: pointer;
        `;

        // Create modal content container
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            position: relative;
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            align-items: center;
        `;

        // Create image element
        const image = document.createElement('img');
        image.src = imageSrc;
        image.style.cssText = `
            width: 512px;
            height: 512px;
            object-fit: cover;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        `;

        // Create image info bar
        const imageInfo = document.createElement('div');
        imageInfo.style.cssText = `
            color: #fff;
            text-align: center;
            margin-top: 16px;
            font-size: 14px;
            opacity: 0.8;
        `;
        imageInfo.textContent = imageName;

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: -20px;
            right: -20px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 32px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
        `;

        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        });

        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });

        // Event listeners
        const closeModal = () => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Add keyboard support (ESC to close)
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleKeyPress);
            }
        };
        document.addEventListener('keydown', handleKeyPress);

        modalContent.appendChild(closeBtn);
        modalContent.appendChild(image);
        modalContent.appendChild(imageInfo);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Add loading state
        image.onload = () => {
            imageInfo.textContent = `${imageName} (${image.naturalWidth} × ${image.naturalHeight})`;
        };

        image.onerror = () => {
            imageInfo.textContent = `${imageName} (Failed to load)`;
            image.style.display = 'none';
        };
    }

    showPackagePreview(asset, packageData) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
        background: #2d2d2d;
        border-radius: 8px;
        width: 90%;
        max-width: 700px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        border: 1px solid #555;
    `;

        // Header with image and info layout
        const header = document.createElement('div');
        header.style.cssText = `
        padding: 20px;
        border-bottom: 1px solid #555;
        background: #3d3d3d;
        border-radius: 8px 8px 0 0;
    `;

        // Build image HTML (256x256)
        let imageHtml = '';
        if (asset.customIcon && asset.customIcon.data) {
            imageHtml = `<img src="${asset.customIcon.data}" style="width: 256px; height: 256px; border-radius: 8px; object-fit: cover; margin-right: 20px;">`;
        } else {
            imageHtml = `<div style="width: 256px; height: 256px; border-radius: 8px; background: rgba(0, 120, 212, 0.1); border: 1px solid rgba(0, 120, 212, 0.3); display: flex; align-items: center; justify-content: center; margin-right: 20px;">
                <i class="fas ${asset.icon}" style="font-size: 48px; color: #0078d4;"></i>
            </div>`;
        }

        header.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="display: flex; align-items: flex-start;">
                ${imageHtml}
                <div style="flex: 1;">
                    <h2 style="margin: 0 0 8px 0; color: #fff; font-size: 20px;">
                        ${asset.name}
                    </h2>
                    <div style="margin-bottom: 8px;">
                        <div style="margin-bottom: 4px;"><strong style="color: #aaa;">Author:</strong> <span style="color: #fff;">${asset.author || 'Unknown'}</span></div>
                        <div style="margin-bottom: 4px;"><strong style="color: #aaa;">Version:</strong> <span style="color: #fff;">${asset.version || 'Unknown'}</span></div>
                        <div style="margin-bottom: 4px;"><strong style="color: #aaa;">Type:</strong> <span style="color: #fff;">${asset.type}</span></div>
                        <div><strong style="color: #aaa;">Size:</strong> <span style="color: #fff;">${asset.size}</span></div>
                    </div>
                </div>
            </div>
            <button class="close-preview" style="
                background: none;
                border: none;
                color: #aaa;
                font-size: 24px;
                cursor: pointer;
                padding: 4px;
                margin-left: 16px;
            ">×</button>
        </div>
        <div style="margin-top: 16px; color: #bbb; font-size: 14px; line-height: 1.4;">
            ${asset.description}
        </div>
    `;

        // Body
        const body = document.createElement('div');
        body.style.cssText = `
        padding: 20px;
    `;

        // Package contents
        const contentsSection = document.createElement('div');
        contentsSection.innerHTML = '<h3 style="color: #fff; margin-bottom: 16px;">Package Contents</h3>';

        const contentsList = document.createElement('div');
        contentsList.style.cssText = `
        background: #1e1e1e;
        border: 1px solid #555;
        border-radius: 6px;
        max-height: 300px;
        overflow-y: auto;
    `;

        // Show files or assets
        if (packageData.files) {
            this.renderFilesList(packageData.files, contentsList);
        } else if (packageData.assets) {
            this.renderAssetsList(packageData.assets, contentsList);
        } else {
            contentsList.innerHTML = '<p style="padding: 20px; color: #aaa; text-align: center;">No contents found</p>';
        }

        contentsSection.appendChild(contentsList);

        // Directory structure (if available)
        if (packageData.directories && packageData.directories.length > 0) {
            const dirSection = document.createElement('div');
            dirSection.style.cssText = 'margin-top: 20px;';
            dirSection.innerHTML = '<h3 style="color: #fff; margin-bottom: 16px;">Directory Structure</h3>';

            const dirList = document.createElement('div');
            dirList.style.cssText = `
            background: #1e1e1e;
            border: 1px solid #555;
            border-radius: 6px;
            padding: 12px;
            font-family: 'Consolas', monospace;
            font-size: 12px;
            color: #4CAF50;
        `;

            packageData.directories.forEach(dir => {
                const dirItem = document.createElement('div');
                dirItem.style.cssText = 'margin-bottom: 4px;';
                dirItem.innerHTML = `<i class="fas fa-folder"></i> ${dir}`;
                dirList.appendChild(dirItem);
            });

            dirSection.appendChild(dirList);
            contentsSection.appendChild(dirSection);
        }

        body.appendChild(contentsSection);

        modalContent.appendChild(header);
        modalContent.appendChild(body);
        modal.appendChild(modalContent);

        // Event listeners
        const closeBtn = header.querySelector('.close-preview');
        const closeModal = () => {
            if (modal.parentNode) modal.parentNode.removeChild(modal);
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Add click handlers for images in the package preview
        modal.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                e.stopPropagation();
                this.handleImageClick(e.target.src, e.target.alt || 'Package Image');
            }
        });

        document.body.appendChild(modal);
    }

    renderFilesList(files, container) {
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.style.cssText = `
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid #333;
        font-size: 13px;
        cursor: pointer;
        transition: background-color 0.2s;
    `;

            const icon = this.getFileIcon(file.path);
            const fileName = file.name || file.path.split('/').pop();
            const filePath = file.path;
            const isDocFile = fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase() === 'documentation.doc';

            fileItem.innerHTML = `
        <i class="fas ${icon}" style="margin-right: 8px; color: #4CAF50; width: 16px;"></i>
        <span style="color: #fff; flex: 1;">${fileName}</span>
        <span style="color: #666; font-size: 11px;">${filePath}</span>
        ${isDocFile ? '<i class="fas fa-book-open" style="margin-left: 8px; color: #0078d4;" title="Open Documentation"></i>' : ''}
    `;

            // Add hover effect
            fileItem.addEventListener('mouseenter', () => {
                fileItem.style.backgroundColor = '#3a3a3a';
            });

            fileItem.addEventListener('mouseleave', () => {
                fileItem.style.backgroundColor = '';
            });

            // Add click handler for documentation files
            if (isDocFile) {
                fileItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openDocumentationFile(file);
                });
            }

            container.appendChild(fileItem);
        });
    }

    createAssetItem(asset, index) {
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.dataset.index = index;
        item.style.cssText = `
        display: flex;
        align-items: flex-start;
        padding: 16px;
        border-bottom: 1px solid #3a3a3a;
        cursor: pointer;
        transition: background-color 0.2s;
        min-height: 80px;
    `;

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.cssText = `
        margin-right: 12px;
        margin-top: 4px;
        transform: scale(1.2);
        flex-shrink: 0;
    `;
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.selectedAssets.add(index);
                item.style.backgroundColor = '#2a4a7a';
            } else {
                this.selectedAssets.delete(index);
                item.style.backgroundColor = '';
            }
            this.updateSelectionInfo();
        });

        // Icon (custom or FontAwesome)
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = `
        margin-right: 12px;
        margin-top: 4px;
        width: 48px;
        height: 48px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        background: rgba(0, 120, 212, 0.1);
        border: 1px solid rgba(0, 120, 212, 0.3);
    `;

        if (asset.customIcon && asset.customIcon.data) {
            // Use custom icon image
            const iconImg = document.createElement('img');
            iconImg.src = asset.customIcon.data;
            iconImg.style.cssText = `
            width: 40px;
            height: 40px;
            border-radius: 4px;
            object-fit: cover;
        `;
            iconImg.onerror = () => {
                // Fallback to FontAwesome icon if image fails to load
                iconContainer.innerHTML = `<i class="fas ${asset.icon || 'fa-file'}" style="font-size: 20px; color: #0078d4;"></i>`;
            };
            iconContainer.appendChild(iconImg);
        } else {
            // Use FontAwesome icon
            const icon = document.createElement('i');
            icon.className = `fas ${asset.icon || 'fa-file'}`;
            icon.style.cssText = `
            font-size: 20px;
            color: #0078d4;
        `;
            iconContainer.appendChild(icon);
        }

        // Content
        const content = document.createElement('div');
        content.style.cssText = `
        flex: 1;
        min-width: 0;
    `;

        // Asset pack name (prominent)
        const nameElement = document.createElement('div');
        nameElement.textContent = asset.name;
        nameElement.style.cssText = `
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 6px;
        font-size: 16px;
        line-height: 1.2;
    `;

        // Description (multi-line support)
        const descElement = document.createElement('div');
        descElement.textContent = asset.description;
        descElement.style.cssText = `
        font-size: 13px;
        color: #bbb;
        margin-bottom: 8px;
        line-height: 1.4;
        word-wrap: break-word;
    `;

        // Enhanced metadata row with author and version
        const metaRow1 = document.createElement('div');
        metaRow1.style.cssText = `
        font-size: 11px;
        color: #888;
        margin-bottom: 4px;
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
    `;

        const authorInfo = asset.author && asset.author !== 'Unknown' ?
            `<span><i class="fas fa-user"></i> ${asset.author}</span>` : '';
        const versionInfo = asset.version ?
            `<span><i class="fas fa-tag"></i> v${asset.version}</span>` : '';

        metaRow1.innerHTML = `
        ${authorInfo}
        ${versionInfo}
        ${asset.timestamp ? `<span><i class="fas fa-clock"></i> ${new Date(asset.timestamp).toLocaleDateString()}</span>` : ''}
    `;

        // File info row
        const metaRow2 = document.createElement('div');
        metaRow2.style.cssText = `
        font-size: 11px;
        color: #666;
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
    `;
        metaRow2.innerHTML = `
        <span><i class="fas fa-file"></i> ${asset.filename}</span>
        <span><i class="fas fa-weight"></i> ${asset.size}</span>
        <span><i class="fas fa-layer-group"></i> ${asset.assetCount || 0} assets</span>
        ${asset.totalDirectories ? `<span><i class="fas fa-folder"></i> ${asset.totalDirectories} dirs</span>` : ''}
        ${asset.customIcon ? `<span><i class="fas fa-image"></i> Custom icon</span>` : ''}
    `;

        content.appendChild(nameElement);
        content.appendChild(descElement);
        content.appendChild(metaRow1);
        content.appendChild(metaRow2);

        // Preview button
        const previewBtn = document.createElement('button');
        previewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        previewBtn.title = 'Preview Package Contents';
        previewBtn.style.cssText = `
        margin-left: 8px;
        margin-top: 4px;
        padding: 6px 8px;
        background: #0078d4;
        border: none;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        flex-shrink: 0;
    `;
        previewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.previewAssetPackage(asset, index);
        });

        // Hover effects
        item.addEventListener('mouseenter', () => {
            if (!checkbox.checked) {
                item.style.backgroundColor = '#3a3a3a';
            }
            previewBtn.style.backgroundColor = '#106ebe';
        });

        item.addEventListener('mouseleave', () => {
            if (!checkbox.checked) {
                item.style.backgroundColor = '';
            }
            previewBtn.style.backgroundColor = '#0078d4';
        });

        // Click to toggle
        item.addEventListener('click', (e) => {
            if (e.target !== checkbox && e.target !== previewBtn) {
                // Check if the click was on an image
                const clickedElement = e.target;
                if (clickedElement.tagName === 'IMG') {
                    e.stopPropagation();
                    this.handleImageClick(clickedElement.src, asset.name);
                    return;
                }

                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });

        item.appendChild(checkbox);
        item.appendChild(iconContainer);
        item.appendChild(content);
        item.appendChild(previewBtn);

        return item;
    }

    handleImageClick(imageSrc, assetName) {
        // Show the image in a modal
        this.showImageModal(imageSrc, assetName);
    }

    selectAllAssets() {
        this.selectedAssets.clear();
        this.availableAssets.forEach((_, index) => {
            this.selectedAssets.add(index);
        });
        this.updateCheckboxes();
        this.updateSelectionInfo();
    }

    deselectAllAssets() {
        this.selectedAssets.clear();
        this.updateCheckboxes();
        this.updateSelectionInfo();
    }

    updateCheckboxes() {
        const checkboxes = this.assetsList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((checkbox, index) => {
            const item = checkbox.closest('.asset-item');
            checkbox.checked = this.selectedAssets.has(index);
            item.style.backgroundColor = checkbox.checked ? '#2a4a7a' : '';
        });
    }

    updateSelectionInfo() {
        const selectedCount = this.selectedAssets.size;
        const totalCount = this.availableAssets.length;

        if (selectedCount === 0) {
            this.selectionInfo.textContent = `${totalCount} assets available`;
        } else {
            this.selectionInfo.textContent = `${selectedCount} of ${totalCount} assets selected`;
        }

        // Enable/disable import button
        const importBtn = this.getComponent('importAssets');
        if (importBtn) {
            importBtn.disabled = selectedCount === 0;
            importBtn.style.opacity = selectedCount === 0 ? '0.5' : '1';
        }
    }

    async importSelectedAssets() {
        if (this.selectedAssets.size === 0) {
            return;
        }

        if (!window.fileBrowser) {
            this.showError('File browser not available');
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;
            const importedAssets = [];

            for (const index of this.selectedAssets) {
                const asset = this.availableAssets[index];

                try {
                    // Load the actual .dmjs file content
                    const dmjsContent = await this.loadAssetContent(asset.filename);
                    const assetPackage = JSON.parse(dmjsContent);

                    // Handle the enhanced format with directory structure
                    await this.importAssetPackageWithStructure(assetPackage, asset, importedAssets);
                    successCount++;

                } catch (error) {
                    console.error(`Failed to import ${asset.name}:`, error);
                    errorCount++;
                }
            }

            // Show result
            if (errorCount === 0) {
                this.showSuccess(`Successfully imported ${successCount} asset package(s) with ${importedAssets.length} total assets`);
            } else {
                this.showWarning(`Imported ${successCount} package(s), ${errorCount} failed`);
            }

            // Refresh file browser and navigate to imported assets
            if (window.fileBrowser.refreshFiles) {
                await window.fileBrowser.refreshFiles();
            }
            await window.fileBrowser.navigateTo('/Assets');

        } catch (error) {
            this.showError('Failed to import assets: ' + error.message);
        }
    }

    async importAssetPackageWithStructure(assetPackage, asset, importedAssets) {
        const packageName = assetPackage.name || asset.filename.replace('.dmjs', '');
        const sanitizedPackageName = packageName.replace(/[^a-z0-9\s]/gi, '_');
        const baseImportPath = `/Assets/${sanitizedPackageName}`;

        // Create the main package directory
        await window.fileBrowser.createDirectory(baseImportPath);

        // Create directory structure if available
        if (assetPackage.directories && assetPackage.directories.length > 0) {
            console.log(`Creating directory structure for ${packageName}:`, assetPackage.directories);

            for (const dirPath of assetPackage.directories) {
                const fullDirPath = `${baseImportPath}${dirPath}`;
                try {
                    await window.fileBrowser.createDirectory(fullDirPath);
                    console.log(`Created directory: ${fullDirPath}`);
                } catch (error) {
                    console.warn(`Failed to create directory ${fullDirPath}:`, error);
                }
            }
        }

        // Import files with preserved structure
        if (assetPackage.files) {
            console.log(`Importing ${assetPackage.files.length} files with directory structure`);

            for (const file of assetPackage.files) {
                try {
                    // Preserve original path structure
                    const targetPath = `${baseImportPath}${file.path}`;

                    // Ensure parent directory exists
                    const parentPath = targetPath.substring(0, targetPath.lastIndexOf('/'));
                    if (parentPath !== baseImportPath) {
                        await window.fileBrowser.createDirectory(parentPath);
                    }

                    // Write file with preserved structure
                    await window.fileBrowser.writeFile(targetPath, file.content, true);
                    importedAssets.push(file.name || file.path.split('/').pop());

                    console.log(`Imported file: ${targetPath}`);

                    // Register JavaScript modules
                    if (targetPath.endsWith('.js') && file.content.includes('extends Module')) {
                        try {
                            await window.fileBrowser.loadAndRegisterModule(targetPath, file.content);
                        } catch (error) {
                            console.warn(`Failed to register module ${targetPath}:`, error);
                        }
                    }

                } catch (error) {
                    console.error(`Error importing file ${file.path}:`, error);
                    throw error;
                }
            }
        }
        // Fallback to assets format for legacy packages
        else if (assetPackage.assets) {
            console.log(`Importing ${assetPackage.assets.length} assets in legacy format`);

            for (const assetData of assetPackage.assets) {
                await this.importSingleAsset(assetData, baseImportPath, packageName);
                importedAssets.push(assetData.name || assetData.type);
            }
        }

        // Create package info file for reference
        const packageInfo = {
            name: assetPackage.name,
            description: assetPackage.description,
            version: assetPackage.version,
            author: assetPackage.author,
            importedAt: Date.now(),
            originalFilename: asset.filename,
            totalFiles: assetPackage.totalFiles || (assetPackage.files || assetPackage.assets || []).length,
            totalDirectories: assetPackage.totalDirectories || (assetPackage.directories || []).length
        };

        await window.fileBrowser.writeFile(
            `${baseImportPath}/package-info.json`,
            JSON.stringify(packageInfo, null, 2),
            true
        );

        console.log(`Successfully imported asset package: ${packageName}`);
    }

    /**
     * Import a single asset from a .dmjs package
     * @param {Object} assetData - The asset data from the package
     * @param {string} importPath - Base path to import to
     * @param {string} packageName - Name of the asset package
     */
    async importSingleAsset(assetData, importPath, packageName) {
        try {
            let fileName;
            let fileContent;
            let filePath;

            // First, check if we have an original path - if so, use that filename directly
            if (assetData.originalPath) {
                fileName = assetData.originalPath.split('/').pop();

                // Determine content based on file type
                if (typeof assetData.data === 'string' && assetData.data.startsWith('data:')) {
                    fileContent = assetData.data;
                } else if (typeof assetData.data === 'object' && assetData.data.content) {
                    fileContent = assetData.data.content;
                } else if (typeof assetData.data === 'object' && assetData.data.code) {
                    fileContent = assetData.data.code;
                } else if (typeof assetData.data === 'object') {
                    fileContent = JSON.stringify(assetData.data, null, 2);
                } else {
                    fileContent = assetData.data;
                }

                filePath = `${importPath}/${fileName}`;
            } else {
                // Fallback to type-based naming for assets without original paths
                switch (assetData.type) {
                    case 'image':
                        const imageExt = assetData.data.format || 'png';
                        fileName = `${assetData.name || 'image'}.${imageExt}`;
                        fileContent = assetData.data.content;
                        break;

                    case 'script':
                    case 'module':
                        fileName = `${assetData.name || 'script'}.js`;
                        fileContent = assetData.data.code || assetData.data.content || assetData.data;
                        break;

                    case 'prefab':
                        fileName = `${assetData.name || 'prefab'}.prefab`;
                        fileContent = JSON.stringify(assetData.data, null, 2);
                        break;

                    case 'scene':
                        fileName = `${assetData.name || 'scene'}.scene`;
                        fileContent = JSON.stringify(assetData.data, null, 2);
                        break;

                    case 'audio':
                        const audioExt = assetData.data.format || 'mp3';
                        fileName = `${assetData.name || 'audio'}.${audioExt}`;
                        fileContent = assetData.data.content;
                        break;

                    case 'ui-pack':
                        fileName = `${assetData.name || 'ui-components'}.json`;
                        fileContent = JSON.stringify(assetData.data, null, 2);
                        break;

                    case 'effects':
                        fileName = `${assetData.name || 'effects'}.json`;
                        fileContent = JSON.stringify(assetData.data, null, 2);
                        break;

                    case 'system':
                        fileName = `${assetData.name || 'system'}.js`;
                        fileContent = assetData.data.code || JSON.stringify(assetData.data, null, 2);
                        break;

                    case 'json':
                    case 'data':
                    case 'text':
                    default:
                        // For generic data, try to determine the best extension
                        let baseName = assetData.name || 'data';

                        // Only add extension if the name doesn't already have one
                        if (!baseName.includes('.')) {
                            if (typeof assetData.data === 'object') {
                                baseName += '.json';
                            } else if (typeof assetData.data === 'string' && (assetData.data.includes('function') || assetData.data.includes('class'))) {
                                baseName += '.js';
                            } else {
                                baseName += '.txt';
                            }
                        }

                        fileName = baseName;
                        fileContent = typeof assetData.data === 'object' ?
                            JSON.stringify(assetData.data, null, 2) :
                            assetData.data;
                        break;
                }

                filePath = `${importPath}/${fileName}`;
            }

            // Ensure the file doesn't already exist, or create unique name
            let finalPath = filePath;
            let counter = 1;
            while (await window.fileBrowser.exists(finalPath)) {
                const lastDotIndex = fileName.lastIndexOf('.');
                let baseName, extension;

                if (lastDotIndex > 0) {
                    baseName = fileName.substring(0, lastDotIndex);
                    extension = fileName.substring(lastDotIndex);
                } else {
                    baseName = fileName;
                    extension = '';
                }

                const newFileName = `${baseName}_${counter}${extension}`;
                finalPath = `${importPath}/${newFileName}`;
                counter++;
            }

            // Create the file in FileBrowser
            const success = await window.fileBrowser.createFile(finalPath, fileContent, false);

            if (success) {
                console.log(`Successfully imported asset: ${finalPath}`);

                // If it's a JavaScript file, try to register it as a module
                if (finalPath.endsWith('.js') && fileContent.includes('extends Module')) {
                    try {
                        await window.fileBrowser.loadAndRegisterModule(finalPath, fileContent);
                    } catch (error) {
                        console.warn(`Failed to register module ${finalPath}:`, error);
                    }
                }
            } else {
                throw new Error(`Failed to create file: ${finalPath}`);
            }

        } catch (error) {
            console.error(`Error importing asset ${assetData.name}:`, error);
            throw error;
        }
    }

    openDocumentationFile(file) {
        try {
            console.log('Opening documentation file:', file.name);

            // Parse the documentation content
            let docContent = file.content;

            // If content is a string that looks like JSON, parse it
            if (typeof docContent === 'string' && docContent.trim().startsWith('{')) {
                try {
                    docContent = JSON.parse(docContent);
                } catch (e) {
                    console.warn('Could not parse documentation as JSON, treating as plain text');
                }
            } 

            if (window.SpriteCodeDocs) {
                const docs = new window.SpriteCodeDocs();
                docs.loadFromJSONObject(docContent);
                docs.open();
            } else {
                this.showNotification('SpriteCodeDocs not available', 'error');
            }

            } catch (error) {
                console.error('Error opening documentation file:', error);
                this.showError('Failed to open documentation: ' + error.message);
            }
    }

    createDocumentationObject(content, filename) {
        // Create a Documentation-compatible object
        const doc = {
            title: 'Documentation',
            sections: []
        };

        // If content is already structured
        if (typeof content === 'object' && content !== null) {
            doc.title = content.title || content.name || filename.replace('.doc', '');
            doc.sections = content.sections || [];

            // Handle various documentation formats
            if (content.description && !doc.sections.length) {
                doc.sections.push({
                    title: 'Overview',
                    content: content.description
                });
            }

            if (content.methods && Array.isArray(content.methods)) {
                doc.sections.push({
                    title: 'Methods',
                    content: content.methods.map(m =>
                        `**${m.name}**${m.params ? `(${m.params})` : ''}\n${m.description || ''}`
                    ).join('\n\n')
                });
            }

            if (content.properties && Array.isArray(content.properties)) {
                doc.sections.push({
                    title: 'Properties',
                    content: content.properties.map(p =>
                        `**${p.name}** - ${p.description || ''}`
                    ).join('\n\n')
                });
            }

            if (content.examples && Array.isArray(content.examples)) {
                doc.sections.push({
                    title: 'Examples',
                    content: content.examples.map(e =>
                        `${e.title ? `**${e.title}**\n` : ''}${e.code || e.content || e}`
                    ).join('\n\n')
                });
            }
        } else if (typeof content === 'string') {
            // Plain text documentation
            doc.title = filename.replace('.doc', '');
            doc.sections = [{
                title: 'Documentation',
                content: content
            }];
        }

        return doc;
    }

    async loadAssetContent(filename) {
        try {
            // Try to load the actual file from the assets directory
            const response = await fetch(`${this.assetsPath}${filename}`);
            if (response.ok) {
                return await response.text();
            }
        } catch (error) {
            console.warn(`Could not load real asset ${filename}, using fallback`);
        }

        // Fall back to generated content if file doesn't exist
        return this.generateRealisticAssetContent(filename);
    }

    async scanRealAssetsDirectory() {
        // Method 1: Try known asset filenames directly (most reliable)

        for (const filename of this.knownAssets) {
            try {
                const response = await fetch(`${this.assetsPath}${filename}`);
                if (response.ok) {
                    const content = await response.text();
                    const assetInfo = this.parseAssetPackageInfo(filename, content);
                    if (assetInfo) {
                        // Check if we already have this asset to prevent duplicates
                        const exists = this.availableAssets.some(asset => asset.filename === filename);
                        if (!exists) {
                            this.availableAssets.push(assetInfo);
                        }
                    }
                }
            } catch (error) {
                // File doesn't exist, continue
            }
        }

        // Method 2: If you have a way to get file listings from your server,
        // replace this section with your server API call
        // For example:
        // try {
        //     const response = await fetch('/api/assets/list');
        //     const fileList = await response.json();
        //     // Process fileList...
        // } catch (error) {
        //     console.log('Server API not available');
        // }
    }

    extractDmjsFilesFromHTML(html) {
        const dmjsFiles = [];
        // Parse HTML directory listing to find .dmjs files
        const linkRegex = /<a[^>]+href="([^"]*\.dmjs)"[^>]*>/gi;
        let match;

        while ((match = linkRegex.exec(html)) !== null) {
            const filename = match[1];
            if (!filename.includes('/') && filename.endsWith('.dmjs')) {
                dmjsFiles.push(filename);
            }
        }

        return dmjsFiles;
    }

    async analyzeAssetFile(filename) {
        try {
            const response = await fetch(`${this.assetsPath}${filename}`);
            if (!response.ok) return null;

            const content = await response.text();
            return this.parseAssetPackageInfo(filename, content);
        } catch (error) {
            console.error(`Error analyzing ${filename}:`, error);
            return null;
        }
    }

    parseAssetPackageInfo(filename, content) {
        try {
            const packageData = JSON.parse(content);

            // Enhanced parsing to handle the new asset pack format with metadata
            let standardPackage = {};

            // Handle new enhanced format with full metadata
            if (packageData.name && packageData.description && packageData.directories) {
                standardPackage = {
                    name: packageData.name,
                    description: packageData.description,
                    version: packageData.version || '1.0.0',
                    author: packageData.author || 'Unknown',
                    timestamp: packageData.timestamp || Date.now(),
                    totalFiles: packageData.totalFiles || 0,
                    totalDirectories: packageData.totalDirectories || 0,
                    directories: packageData.directories || [],
                    files: packageData.files || [],
                    metadata: packageData.metadata || {},
                    icon: packageData.icon || null // Add icon support
                };
            }
            // Handle texture generator format (files array)
            else if (packageData.files && !packageData.assets) {
                const assets = packageData.files.map(file => ({
                    type: file.type === 'file' && file.path.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i) ? 'image' :
                        file.type === 'file' && file.path.match(/\.js$/i) ? 'script' : 'data',
                    name: file.name || file.path.split('/').pop().replace(/\.[^/.]+$/, ""),
                    data: file.type === 'file' && file.path.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i) ?
                        { format: file.path.split('.').pop().toLowerCase(), content: file.content } :
                        file.type === 'file' && file.path.match(/\.js$/i) ?
                            { code: file.content } : file.content,
                    originalPath: file.path
                }));

                standardPackage = {
                    name: packageData.name || filename.replace('.dmjs', ''),
                    description: packageData.description || `Asset package containing ${assets.length} file(s)`,
                    version: packageData.version || '1.0',
                    author: packageData.author || 'Unknown',
                    timestamp: packageData.timestamp || Date.now(),
                    totalFiles: packageData.files.length,
                    totalDirectories: 0,
                    assets: assets,
                    files: packageData.files,
                    icon: packageData.icon || null
                };
            }
            // Handle standard asset package format
            else if (packageData.name && packageData.assets) {
                standardPackage = {
                    name: packageData.name,
                    description: packageData.description || 'Standard asset package',
                    version: packageData.version || '1.0',
                    author: packageData.author || 'Unknown',
                    timestamp: packageData.timestamp || Date.now(),
                    totalFiles: packageData.assets.length,
                    totalDirectories: 0,
                    assets: packageData.assets,
                    icon: packageData.icon || null
                };
            }
            // Handle legacy or other formats
            else if (packageData.name) {
                standardPackage = {
                    name: packageData.name,
                    description: packageData.description || 'Legacy asset package',
                    version: packageData.version || '1.0',
                    author: packageData.author || 'Unknown',
                    timestamp: Date.now(),
                    totalFiles: (packageData.assets || []).length,
                    totalDirectories: 0,
                    assets: packageData.assets || [],
                    icon: packageData.icon || null
                };
            } else {
                return null;
            }

            return this.createAssetInfo(filename, standardPackage, content.length);

        } catch (error) {
            console.error(`Error parsing package ${filename}:`, error);
            return null;
        }
    }

    createAssetInfo(filename, packageData, contentLength) {
        // Calculate approximate file size
        const size = this.formatFileSize(contentLength);

        // Use package name or filename as display name
        const displayName = packageData.name || filename.replace('.dmjs', '');

        // Determine icon and type based on package content
        let icon = 'fa-box';
        let type = 'asset-pack';

        // Enhanced type detection
        if (packageData.files && packageData.files.length > 0) {
            const fileExtensions = packageData.files.map(f => f.path.split('.').pop().toLowerCase());

            if (fileExtensions.some(ext => ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext))) {
                icon = 'fa-images';
                type = 'texture-pack';
            } else if (fileExtensions.some(ext => ['js', 'ts'].includes(ext))) {
                icon = 'fa-code';
                type = 'script-pack';
            } else {
                icon = 'fa-archive';
                type = 'file-pack';
            }
        } else if (packageData.assets && packageData.assets.length > 0) {
            const assetTypes = packageData.assets.map(a => a.type);

            if (assetTypes.includes('image')) {
                icon = 'fa-image';
                type = 'texture-pack';
            } else if (assetTypes.includes('script') || assetTypes.includes('module')) {
                icon = 'fa-code';
                type = 'script-pack';
            } else if (assetTypes.includes('prefab')) {
                icon = 'fa-cubes';
                type = 'prefab-pack';
            } else if (assetTypes.includes('scene')) {
                icon = 'fa-gamepad';
                type = 'scene-pack';
            } else if (assetTypes.includes('ui-pack')) {
                icon = 'fa-window-restore';
                type = 'ui-pack';
            } else if (assetTypes.includes('effects')) {
                icon = 'fa-fire';
                type = 'effects-pack';
            } else if (assetTypes.includes('system')) {
                icon = 'fa-cogs';
                type = 'system-pack';
            }
        }

        return {
            name: displayName,
            filename: filename,
            description: packageData.description || `Asset package with ${(packageData.files || packageData.assets || []).length} item(s)`,
            type: type,
            size: size,
            icon: icon,
            version: packageData.version,
            author: packageData.author,
            assetCount: (packageData.files || packageData.assets || []).length,
            totalDirectories: packageData.totalDirectories || (packageData.directories || []).length,
            timestamp: packageData.timestamp,
            directories: packageData.directories || [],
            customIcon: packageData.icon // Add custom icon data
        };
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    generateRealisticAssetContent(filename) {
        // Generate realistic asset package content based on the filename
        const baseContent = {
            name: filename.replace('.dmjs', ''),
            version: '1.0.0',
            description: 'Built-in asset package from Dark Matter JS',
            author: 'Dark Matter JS',
            created: Date.now(),
            assets: []
        };

        if (filename.includes('player')) {
            // Player character package
            baseContent.description = 'Basic player character with movement and animation';
            baseContent.assets = [
                {
                    type: 'prefab',
                    name: 'PlayerCharacter',
                    data: {
                        name: 'PlayerCharacter',
                        transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
                        modules: [
                            {
                                type: 'SpriteRenderer',
                                data: {
                                    color: '#4CAF50',
                                    width: 32,
                                    height: 32
                                }
                            },
                            {
                                type: 'PlayerMovement',
                                data: {
                                    speed: 200,
                                    jumpForce: 400
                                }
                            }
                        ]
                    }
                },
                {
                    type: 'script',
                    name: 'PlayerMovement',
                    data: {
                        code: `class PlayerMovement extends Module {
    static namespace = "Player";
    static icon = "fa-running";
    static color = "#4CAF50";
    static description = "Basic player movement with WASD controls";
    
    constructor(options = {}) {
        super("PlayerMovement");
        this.speed = options.speed || 200;
        this.jumpForce = options.jumpForce || 400;
        this.grounded = false;
        
        this.exposeProperty("speed", "number", this.speed, { min: 0, max: 500 });
        this.exposeProperty("jumpForce", "number", this.jumpForce, { min: 0, max: 1000 });
    }
    
    start() {
        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
    }
    
    loop(deltaTime) {
        const position = this.getLocalPosition();
        let velocity = new Vector2(0, 0);
        
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) velocity.x -= this.speed;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) velocity.x += this.speed;
        if (this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['Space']) {
            if (this.grounded) velocity.y -= this.jumpForce;
        }
        
        this.setLocalPosition(new Vector2(
            position.x + velocity.x * deltaTime,
            position.y + velocity.y * deltaTime
        ));
    }
    
    toJSON() {
        return { ...super.toJSON(), speed: this.speed, jumpForce: this.jumpForce };
    }
    
    fromJSON(data) {
        super.fromJSON(data);
        if (data) {
            this.speed = data.speed || 200;
            this.jumpForce = data.jumpForce || 400;
        }
    }
}
window.PlayerMovement = PlayerMovement;`
                    }
                }
            ];
        } else if (filename.includes('enemies')) {
            // Enemies package
            baseContent.description = 'Collection of basic enemy prefabs';
            baseContent.assets = [
                {
                    type: 'prefab',
                    name: 'BasicEnemy',
                    data: {
                        name: 'BasicEnemy',
                        transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
                        modules: [
                            {
                                type: 'SpriteRenderer',
                                data: {
                                    color: '#F44336',
                                    width: 24,
                                    height: 24
                                }
                            },
                            {
                                type: 'EnemyAI',
                                data: {
                                    speed: 100,
                                    detectionRange: 150
                                }
                            }
                        ]
                    }
                },
                {
                    type: 'script',
                    name: 'EnemyAI',
                    data: {
                        code: `class EnemyAI extends Module {
    static namespace = "AI";
    static icon = "fa-skull";
    static color = "#F44336";
    static description = "Basic enemy AI with patrol and chase behavior";
    
    constructor(options = {}) {
        super("EnemyAI");
        this.speed = options.speed || 100;
        this.detectionRange = options.detectionRange || 150;
        this.patrolDistance = options.patrolDistance || 100;
        this.direction = 1;
        this.startPosition = null;
        
        this.exposeProperty("speed", "number", this.speed, { min: 0, max: 300 });
        this.exposeProperty("detectionRange", "number", this.detectionRange, { min: 50, max: 500 });
        this.exposeProperty("patrolDistance", "number", this.patrolDistance, { min: 50, max: 300 });
    }
    
    start() {
        this.startPosition = this.getLocalPosition().clone();
    }
    
    loop(deltaTime) {
        const position = this.getLocalPosition();
        
        // Simple patrol behavior
        if (Math.abs(position.x - this.startPosition.x) >= this.patrolDistance) {
            this.direction *= -1;
        }
        
        this.setLocalPosition(new Vector2(
            position.x + this.direction * this.speed * deltaTime,
            position.y
        ));
    }
    
    toJSON() {
        return { 
            ...super.toJSON(), 
            speed: this.speed, 
            detectionRange: this.detectionRange,
            patrolDistance: this.patrolDistance 
        };
    }
    
    fromJSON(data) {
        super.fromJSON(data);
        if (data) {
            this.speed = data.speed || 100;
            this.detectionRange = data.detectionRange || 150;
            this.patrolDistance = data.patrolDistance || 100;
        }
    }
}
window.EnemyAI = EnemyAI;`
                    }
                }
            ];
        } else if (filename.includes('ui-elements')) {
            // UI Elements package
            baseContent.description = 'Common UI components and layouts';
            baseContent.assets = [
                {
                    type: 'ui-pack',
                    name: 'BasicUIComponents',
                    data: {
                        button: {
                            width: 120,
                            height: 40,
                            backgroundColor: '#2196F3',
                            textColor: '#FFFFFF',
                            borderRadius: 4
                        },
                        panel: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            borderColor: '#555',
                            borderWidth: 1
                        },
                        healthBar: {
                            width: 100,
                            height: 8,
                            backgroundColor: '#333',
                            fillColor: '#4CAF50'
                        }
                    }
                }
            ];
        } else if (filename.includes('particle-effects')) {
            // Particle Effects package
            baseContent.description = 'Fire, smoke, and explosion particle systems';
            baseContent.assets = [
                {
                    type: 'effects',
                    name: 'FireEffect',
                    data: {
                        particleCount: 50,
                        lifetime: 2.0,
                        startColor: '#FF6B00',
                        endColor: '#FF0000',
                        startSize: 4,
                        endSize: 1,
                        velocity: { min: -20, max: 20 },
                        gravity: { x: 0, y: -30 }
                    }
                },
                {
                    type: 'effects',
                    name: 'SmokeEffect',
                    data: {
                        particleCount: 30,
                        lifetime: 3.0,
                        startColor: '#666666',
                        endColor: '#CCCCCC',
                        startSize: 2,
                        endSize: 8,
                        velocity: { min: -10, max: 10 },
                        gravity: { x: 0, y: -10 }
                    }
                }
            ];
        } else if (filename.includes('audio-manager')) {
            // Audio Manager package
            baseContent.description = 'Complete audio system with mixing and effects';
            baseContent.assets = [
                {
                    type: 'system',
                    name: 'AudioManager',
                    data: {
                        code: `class AudioManager extends Module {
    static namespace = "Audio";
    static icon = "fa-volume-up";
    static color = "#9C27B0";
    static description = "Advanced audio management system";
    static allowMultiple = false;
    
    constructor(options = {}) {
        super("AudioManager");
        this.masterVolume = options.masterVolume || 1.0;
        this.musicVolume = options.musicVolume || 0.8;
        this.sfxVolume = options.sfxVolume || 1.0;
        this.audioContext = null;
        this.sounds = new Map();
        
        this.exposeProperty("masterVolume", "range", this.masterVolume, { min: 0, max: 1, step: 0.1 });
        this.exposeProperty("musicVolume", "range", this.musicVolume, { min: 0, max: 1, step: 0.1 });
        this.exposeProperty("sfxVolume", "range", this.sfxVolume, { min: 0, max: 1, step: 0.1 });
    }
    
    start() {
        this.initAudio();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioManager initialized');
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }
    
    playSound(soundId, volume = 1.0, loop = false) {
        // Implementation for playing sounds
        console.log(\`Playing sound: \${soundId}\`);
    }
    
    stopSound(soundId) {
        console.log(\`Stopping sound: \${soundId}\`);
    }
    
    toJSON() {
        return {
            ...super.toJSON(),
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume
        };
    }
    
    fromJSON(data) {
        super.fromJSON(data);
        if (data) {
            this.masterVolume = data.masterVolume || 1.0;
            this.musicVolume = data.musicVolume || 0.8;
            this.sfxVolume = data.sfxVolume || 1.0;
        }
    }
}
window.AudioManager = AudioManager;`
                    }
                }
            ];
        }

        return JSON.stringify(baseContent, null, 2);
    }

    showLoading(show) {
        this.loadingIndicator.style.display = show ? 'block' : 'none';
        this.assetsList.style.display = show ? 'none' : 'block';
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type = 'info') {
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            z-index: 10000;
            min-width: 250px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        `;

        // Set background color based on type
        const colors = {
            info: '#0078d4',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Override window events
    onShow() {
        // Refresh assets when window is shown
        if (this.availableAssets.length === 0) {
            this.scanForAssets();
        }
    }

    onClose() {
        // Clear selections when closing
        this.selectedAssets.clear();
    }
}

// Register the window globally
window.AssetManagerWindow = AssetManagerWindow;

// Auto-register with FileBrowser when it's ready
window.addEventListener('load', () => {
    // Wait a bit for FileBrowser to initialize
    setTimeout(() => {
        if (window.fileBrowser && window.fileBrowser.registerEditorWindow) {
            window.fileBrowser.registerEditorWindow(AssetManagerWindow);
        }
    }, 1000);
});

// Also try to register when FileBrowser becomes available
Object.defineProperty(window, 'fileBrowser', {
    set: function (value) {
        this._fileBrowser = value;
        if (value && value.registerEditorWindow) {
            setTimeout(() => {
                value.registerEditorWindow(AssetManagerWindow);
            }, 100);
        }
    },
    get: function () {
        return this._fileBrowser;
    }
});
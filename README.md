# Dark Matter JS Game Engine

<p align="center">
  <img src="logo.png" alt="Dark Matter JS Logo" width="300"/>
  <br>
  <em>A powerful, component-based 2D game engine for the web.</em>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#examples">Examples</a> 
  
https://horrelltech.github.io/Dark-Matter-JS---Game-Engine/

## Overview

Dark Matter JS is a browser-based game development environment with an integrated editor and runtime engine. Built with modern web technologies, it provides a complete solution for creating, testing, and deploying 2D games directly in your browser.

The engine follows a component-based architecture similar to popular engines like Unity, making it intuitive for developers familiar with those tools while being accessible to newcomers.

## Features

### Core Engine Features
- **Component-Based Architecture**: Build games using reusable modules and components
- **Scene Management**: Organize your game with a flexible scene system
- **Game Object Hierarchy**: Parent-child relationships between game objects
- **Vector Math**: Built-in 2D vector mathematics for transformations and physics
- **Input System**: Comprehensive keyboard, mouse, and touch input handling

### Editor Features
- **Visual Editor**: Create and arrange game objects in a visual scene editor
- **Inspector Panel**: Modify object properties in real-time
- **Hierarchy View**: Manage game objects and their relationships
- **Project Browser**: Organize game assets and scripts
- **Console**: Debug your game with an integrated console
- **Play Mode**: Test your game instantly within the editor
- **Grid & Snapping**: Precise object placement with customizable grid
- **Zen Mode**: Toggle fullscreen/window mode for distraction-free editing
- **AI Assistant in Script Editor**: Get code help, generate modules, and ask questions directly in the script editor


### Development Features
- **Script Editor**: Write and edit game scripts with syntax highlighting and AI-powered assistance
- **Module System**: Create and manage reusable components
- **Scene Serialization**: Save and load your game scenes
- **Export System**: Package your games for distribution

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, or Safari)
- Basic knowledge of JavaScript and HTML

### Online Editor
The easiest way to get started is by using our online editor:
[Dark Matter Development Environment](https://horrelltech.github.io/Dark-Matter-JS---Game-Engine)

### Local Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/Dark-Matter-JS---Game-Engine.git
```

2. Navigate to the project folder:
```bash
cd Dark-Matter-JS---Game-Engine
```

3. Open `index.html` in your browser or set up a local server:
```bash
# Using Python 3
python -m http.server

# Using Node.js
npx http-server
```

4. Access the editor at `http://localhost:8000` or the port specified by your server.

## Documentation

## Zen Mode

Zen Mode provides a distraction-free editing experience by toggling the editor into fullscreen. Click the "Zen Mode" button (moon/sun icon) in the toolbar to enter or exit fullscreen mode. The icon updates to indicate the current state.

## Script Editor & AI Assistant

The Script Editor features syntax highlighting, code formatting, and undo/redo support. It also includes an integrated **AI Assistant** panel, which allows you to:

- **Ask questions about your code or the module system**
- **Generate new modules or scripts**
- **Request code fixes or improvements**
- **Insert generated code directly into your script**

Supported AI providers include ChatGPT (OpenAI), Gemini (Google), and Claude (Anthropic). You can configure your API keys and default provider in the AI settings dialog within the Script Editor.

**How to use the AI Assistant:**
1. Open a script file in the Script Editor.
2. Click the robot icon to open the AI panel.
3. Type your question or request (e.g., "Create a movement module for my player").
4. Choose context buttons to include current code or selection.
5. Send your message and review the AI's response.
6. Insert generated code directly into your script with one click.

### Game Objects
Game objects are the fundamental building blocks in Dark Matter JS. Each game object can have:
- Transformation properties (position, rotation, scale)
- Parent-child relationships
- Multiple modules (components)
- Tags for organization

### Modules
Modules are components that add behavior and functionality to game objects:
- **Built-in Modules**
  - SpriteRenderer: Renders images and animations
  - Transform: Handles positioning and hierarchy
  - Drawing: Different modules for drawing shapes and one for infinitely generated, parallax backgrounds
  - Tween: For tweening an objects values (for example sine in and out position.x)
  - KeyboardController: Basic keyboard controller to control a game object with the keyboard

- **Custom Modules**
  - Create your own modules by extending the Module class
  - Expose properties for the inspector
  - Implement lifecycle methods (preload, start, loop, etc.)

### Lifecycle Methods
When creating custom modules, you can implement these methods:
- `preload()`: Called before the game starts, used for loading assets
- `start()`: Called when the module is first activated
- `beginLoop()`: Called at the beginning of each frame
- `loop(deltaTime)`: Called every frame with the time since last frame
- `endLoop()`: Called at the end of each frame
- `draw(ctx)`: Called when the module should render
- `onDestroy()`: Called when the module is being destroyed

## Examples

### Creating a Simple Game Object
```javascript
// Create a new game object
const player = new GameObject("Player");
player.position = new Vector2(400, 300);

// Add it to the scene
scene.gameObjects.push(player);
```

### Creating a Custom Module
```javascript
class PlayerController extends Module {
    constructor() {
        super("PlayerController");
        
        this.speed = 5;
        this.health = 100;
        
        // Expose properties to the inspector
        this.exposeProperty("speed", "number", 5, { min: 0, max: 20 });
        this.exposeProperty("health", "number", 100);
    }
    
    start() {
        console.log("Player controller started!");
    }
    
    loop(deltaTime) {
        // Handle movement based on input
        if (window.input.keyDown("ArrowRight")) {
            this.gameObject.position.x += this.speed * deltaTime;
        }
        
        if (window.input.keyDown("ArrowLeft")) {
            this.gameObject.position.x -= this.speed * deltaTime;
        }
    }
}
```

## Architecture

Dark Matter JS consists of several key components:

### Core Systems
- **Engine**: Manages the game loop and runtime environment
- **Scene**: Organizes game objects and assets
- **GameObject**: Base entity for all in-game elements
- **Module**: Component system for extending functionality
- **InputManager**: Handles user input across platforms
- **SceneManager**: Handles loading and saving scenes

### Editor Systems
- **Editor**: Main interface for manipulating the game
- **HierarchyManager**: Manages object relationships
- **Inspector**: Property editor for game objects
- **FileBrowser**: Project asset management
- **ScriptEditor**: Code editing environment

## Development Roadmap

- [x] Core engine architecture
- [x] Visual editor with object manipulation
- [x] Component-based game object system
- [x] Scene management and serialization
- [x] Input handling system
- [x] Zen Mode (fullscreen editing)
- [x] AI Assistant in Script Editor
- [x] Asset management system
- [x] Particle effects
- [x] HTML5 export
- [ ] Physics engine integration
- [ ] Audio system
- [ ] Animation system
- [ ] WebGL functionality for better performance

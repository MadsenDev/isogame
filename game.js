// IsoGame - Isometric Hotel Game
class IsoGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        // Game state
        this.currentTool = 'move';
        this.selectedFurniture = null;
        this.isPlacing = false;
        this.rooms = [];
        this.currentRoom = null;
        this.players = [];
        this.currentPlayerId = 0;
        this.chatMessages = [];
        this.showChat = false;
        this.contextMenuVisible = false;
        this.contextMenuTarget = null;
        
        // Camera
        this.camera = { x: 0, y: 0, zoom: 1 };
        
        // Player system
        this.playerColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
        this.playerNames = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5', 'Player6', 'Player7', 'Player8'];
        
        // Create initial players
        this.createPlayers();
        
        // Grid settings
        this.gridSize = 32;
        this.tileWidth = this.gridSize * 2;
        this.tileHeight = this.gridSize;
        
        // Furniture definitions
        this.furnitureTypes = {
            chair: { name: 'Chair', color: '#8B4513', size: 0.6, emoji: '🪑' },
            table: { name: 'Table', color: '#654321', size: 1.0, emoji: '🪑' },
            bed: { name: 'Bed', color: '#FF69B4', size: 1.2, emoji: '🛏️' },
            sofa: { name: 'Sofa', color: '#8A2BE2', size: 1.0, emoji: '🛋️' },
            tv: { name: 'TV', color: '#000000', size: 0.8, emoji: '📺' }
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.createDefaultRoom();
        this.hideContextMenu(); // Ensure context menu starts hidden
        this.gameLoop();
    }
    
    createPlayers() {
        this.players = [];
        for (let i = 0; i < 4; i++) {
            this.players.push({
                id: i,
                x: 5 + i,
                y: 5,
                targetX: 5 + i,
                targetY: 5,
                color: this.playerColors[i],
                name: this.playerNames[i],
                size: 0.8,
                isMoving: false,
                moveSpeed: 0.15,
                moveTimer: 0,
                moveDelay: 200,
                path: [],
                pathIndex: 0,
                action: 'idle', // idle, sitting, dancing, waving
                actionTimer: 0
            });
        }
    }
    
    setupEventListeners() {
        // Tool buttons
        document.getElementById('move-tool').addEventListener('click', () => this.setTool('move'));
        document.getElementById('furniture-tool').addEventListener('click', () => this.setTool('furniture'));
        document.getElementById('room-tool').addEventListener('click', () => this.setTool('room'));
        
        // Furniture selection
        document.querySelectorAll('.furniture-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.selectFurniture(type);
            });
        });
        
        // Canvas interactions
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleCanvasRightClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Room creation
        document.getElementById('create-room').addEventListener('click', () => this.createRoom());
        
        // Player actions
        document.getElementById('sit-btn').addEventListener('click', () => this.performAction('sitting'));
        document.getElementById('dance-btn').addEventListener('click', () => this.performAction('dancing'));
        document.getElementById('wave-btn').addEventListener('click', () => this.performAction('waving'));
        
        // Hide context menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#context-menu') && !e.target.closest('canvas')) {
                this.hideContextMenu();
            }
        });
        
        // Chat system
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });
    }
    
    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${tool}-tool`).classList.add('active');
        
        // Update cursor
        if (tool === 'move') {
            this.canvas.style.cursor = 'crosshair';
        } else if (tool === 'furniture') {
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'default';
        }
        
        // Show/hide panels
        document.querySelectorAll('.panel').forEach(panel => panel.classList.add('hidden'));
        if (tool === 'furniture') {
            document.getElementById('furniture-panel').classList.remove('hidden');
        } else if (tool === 'room') {
            document.getElementById('room-panel').classList.remove('hidden');
        }
    }
    
    selectFurniture(type) {
        this.selectedFurniture = type;
        this.isPlacing = true;
        document.querySelectorAll('.furniture-item').forEach(item => item.classList.remove('selected'));
        document.querySelector(`[data-type="${type}"]`).classList.add('selected');
    }
    
    createDefaultRoom() {
        const room = {
            id: 'room-1',
            name: 'Main Room',
            width: 20,
            height: 15,
            furniture: [],
            walls: this.generateWalls(20, 15)
        };
        this.rooms.push(room);
        this.currentRoom = room;
        this.updateRoomList();
    }
    
    generateWalls(width, height) {
        const walls = [];
        // Generate walls around the perimeter
        for (let x = 0; x < width; x++) {
            walls.push({ x, y: 0, type: 'wall' });
            walls.push({ x, y: height - 1, type: 'wall' });
        }
        for (let y = 1; y < height - 1; y++) {
            walls.push({ x: 0, y, type: 'wall' });
            walls.push({ x: width - 1, y, type: 'wall' });
        }
        return walls;
    }
    
    createRoom() {
        const roomId = `room-${Date.now()}`;
        const room = {
            id: roomId,
            name: `Room ${this.rooms.length + 1}`,
            width: 15,
            height: 10,
            furniture: [],
            walls: this.generateWalls(15, 10)
        };
        this.rooms.push(room);
        this.currentRoom = room;
        this.updateRoomList();
    }
    
    updateRoomList() {
        const roomList = document.getElementById('room-list');
        roomList.innerHTML = '';
        this.rooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = 'room-item';
            if (room === this.currentRoom) roomItem.classList.add('active');
            roomItem.textContent = room.name;
            roomItem.addEventListener('click', () => this.switchRoom(room));
            roomList.appendChild(roomItem);
        });
    }
    
    switchRoom(room) {
        this.currentRoom = room;
        this.updateRoomList();
    }
    
    handleCanvasClick(e) {
        // Hide context menu on left click
        this.hideContextMenu();
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const worldPos = this.screenToWorld(x, y);
        
        if (this.currentTool === 'move') {
            this.movePlayerTo(worldPos.x, worldPos.y);
        } else if (this.currentTool === 'furniture' && this.isPlacing && this.selectedFurniture) {
            this.placeFurniture(worldPos.x, worldPos.y);
        }
    }
    
    handleCanvasRightClick(e) {
        e.preventDefault(); // Prevent default context menu
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const worldPos = this.screenToWorld(x, y);
        
        // Check if right-clicking on a player
        const clickedPlayer = this.players.find(player => 
            Math.abs(player.x - worldPos.x) < 0.5 && 
            Math.abs(player.y - worldPos.y) < 0.5
        );
        
        if (clickedPlayer) {
            this.showContextMenu(e.clientX, e.clientY, clickedPlayer);
        } else {
            this.hideContextMenu();
        }
    }
    
    handleCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const worldPos = this.screenToWorld(x, y);
        
        if (this.currentTool === 'move') {
            // Show grid position preview for movement
            const gridX = Math.round(worldPos.x);
            const gridY = Math.round(worldPos.y);
            this.hoverGridPos = { x: gridX, y: gridY };
        } else if (this.isPlacing && this.selectedFurniture) {
            this.previewFurniture = { x: worldPos.x, y: worldPos.y, type: this.selectedFurniture };
        }
    }
    
    handleKeyPress(e) {
        switch(e.key) {
            case 'Escape':
                this.isPlacing = false;
                this.previewFurniture = null;
                this.showChat = false;
                this.hideContextMenu();
                document.getElementById('chat-container').classList.add('hidden');
                break;
            case 'Enter':
                if (!this.showChat) {
                    this.showChat = true;
                    document.getElementById('chat-container').classList.remove('hidden');
                    document.getElementById('chat-input').focus();
                } else {
                    this.sendChatMessage();
                }
                break;
            case '1':
            case '2':
            case '3':
            case '4':
                const playerIndex = parseInt(e.key) - 1;
                if (playerIndex < this.players.length) {
                    this.switchPlayer(playerIndex);
                }
                break;
        }
    }
    
    movePlayerTo(targetX, targetY) {
        const currentPlayer = this.players[this.currentPlayerId];
        if (!currentPlayer) return;
        
        // Snap to grid coordinates
        const gridX = Math.round(targetX);
        const gridY = Math.round(targetY);
        
        // Keep target within room bounds
        const clampedX = Math.max(1, Math.min(this.currentRoom.width - 2, gridX));
        const clampedY = Math.max(1, Math.min(this.currentRoom.height - 2, gridY));
        
        // Check if target position is valid (not blocked by furniture or other players)
        if (!this.isValidPlayerPosition(clampedX, clampedY, currentPlayer.id)) {
            return;
        }
        
        // Only move if it's a different position
        if (clampedX !== currentPlayer.targetX || clampedY !== currentPlayer.targetY) {
            currentPlayer.targetX = clampedX;
            currentPlayer.targetY = clampedY;
            
            // Calculate path using A* pathfinding
            const path = this.findPath(
                Math.round(currentPlayer.x), 
                Math.round(currentPlayer.y), 
                clampedX, 
                clampedY,
                currentPlayer.id
            );
            
            if (path.length > 0) {
                currentPlayer.path = path;
                currentPlayer.pathIndex = 0;
                currentPlayer.isMoving = true;
                currentPlayer.action = 'idle'; // Stop current action when moving
            }
        }
    }
    
    isValidPlayerPosition(x, y, excludePlayerId = -1) {
        // Check if position is blocked by furniture
        if (this.currentRoom.furniture.some(f => f.x === x && f.y === y)) {
            return false;
        }
        
        // Check if position is blocked by other players
        if (this.players.some(p => p.id !== excludePlayerId && p.x === x && p.y === y)) {
            return false;
        }
        
        return true;
    }
    
    switchPlayer(playerId) {
        this.currentPlayerId = playerId;
        const player = this.players[playerId];
        document.getElementById('current-player-name').textContent = player.name;
        document.getElementById('current-player-name').style.color = player.color;
    }
    
    showContextMenu(x, y, player) {
        this.contextMenuVisible = true;
        this.contextMenuTarget = player;
        
        const contextMenu = document.getElementById('context-menu');
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.style.display = 'block';
        contextMenu.style.visibility = 'visible';
        contextMenu.style.opacity = '1';
        
        // Update current player to the clicked player
        this.currentPlayerId = player.id;
        document.getElementById('current-player-name').textContent = player.name;
        document.getElementById('current-player-name').style.color = player.color;
    }
    
    hideContextMenu() {
        this.contextMenuVisible = false;
        this.contextMenuTarget = null;
        const contextMenu = document.getElementById('context-menu');
        contextMenu.style.display = 'none';
        contextMenu.style.visibility = 'hidden';
        contextMenu.style.opacity = '0';
    }
    
    performAction(action) {
        const player = this.contextMenuTarget || this.players[this.currentPlayerId];
        if (player && !player.isMoving) {
            player.action = action;
            player.actionTimer = 0;
            this.addChatMessage(`${player.name} is ${action}!`);
            this.hideContextMenu();
        }
    }
    
    sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (message) {
            const player = this.players[this.currentPlayerId];
            this.addChatMessage(`${player.name}: ${message}`);
            input.value = '';
        }
    }
    
    addChatMessage(message) {
        this.chatMessages.push({
            text: message,
            timestamp: Date.now()
        });
        
        // Keep only last 50 messages
        if (this.chatMessages.length > 50) {
            this.chatMessages.shift();
        }
        
        this.updateChatDisplay();
    }
    
    updateChatDisplay() {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '';
        
        this.chatMessages.slice(-10).forEach(msg => {
            const div = document.createElement('div');
            div.textContent = msg.text;
            div.style.marginBottom = '2px';
            chatMessages.appendChild(div);
        });
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // A* pathfinding algorithm
    findPath(startX, startY, endX, endY, excludePlayerId = -1) {
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        const startKey = `${startX},${startY}`;
        const endKey = `${endX},${endY}`;
        
        // Initialize starting node
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(startX, startY, endX, endY));
        openSet.push({ x: startX, y: startY, key: startKey });
        
        while (openSet.length > 0) {
            // Find node with lowest f score
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (fScore.get(openSet[i].key) < fScore.get(openSet[currentIndex].key)) {
                    currentIndex = i;
                }
            }
            
            const current = openSet.splice(currentIndex, 1)[0];
            
            if (current.key === endKey) {
                // Reconstruct path
                return this.reconstructPath(cameFrom, current);
            }
            
            closedSet.add(current.key);
            
            // Check all 8 directions (including diagonals for isometric movement)
            const directions = [
                { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
                { dx: -1, dy: 0 },                     { dx: 1, dy: 0 },
                { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 }
            ];
            
            for (const dir of directions) {
                const neighborX = current.x + dir.dx;
                const neighborY = current.y + dir.dy;
                const neighborKey = `${neighborX},${neighborY}`;
                
                // Skip if out of bounds or blocked
                if (neighborX < 1 || neighborX >= this.currentRoom.width - 1 ||
                    neighborY < 1 || neighborY >= this.currentRoom.height - 1 ||
                    !this.isValidPlayerPosition(neighborX, neighborY, excludePlayerId) ||
                    closedSet.has(neighborKey)) {
                    continue;
                }
                
                const tentativeGScore = gScore.get(current.key) + 
                    (dir.dx !== 0 && dir.dy !== 0 ? 1.414 : 1); // Diagonal movement costs more
                
                if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighborX, neighborY, endX, endY));
                    
                    if (!openSet.some(node => node.key === neighborKey)) {
                        openSet.push({ x: neighborX, y: neighborY, key: neighborKey });
                    }
                }
            }
        }
        
        return []; // No path found
    }
    
    heuristic(x1, y1, x2, y2) {
        // Manhattan distance for isometric grid
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }
    
    reconstructPath(cameFrom, current) {
        const path = [];
        let node = current;
        
        while (node) {
            path.unshift({ x: node.x, y: node.y });
            node = cameFrom.get(node.key);
        }
        
        return path;
    }
    
    updatePlayerMovement() {
        this.players.forEach(player => {
            if (!player.isMoving) return;
            
            // Check if we've reached the target
            if (player.pathIndex >= player.path.length) {
                player.isMoving = false;
                player.path = [];
                player.pathIndex = 0;
                return;
            }
            
            // Use timer to control movement speed
            player.moveTimer += 16; // Assuming 60fps (16ms per frame)
            
            if (player.moveTimer >= player.moveDelay) {
                player.moveTimer = 0;
                
                // Move to the next position in the path
                const nextPosition = player.path[player.pathIndex];
                player.x = nextPosition.x;
                player.y = nextPosition.y;
                player.pathIndex++;
            }
        });
    }
    
    updatePlayerActions() {
        this.players.forEach(player => {
            if (player.action !== 'idle') {
                player.actionTimer += 16;
                
                // Actions last for 3 seconds
                if (player.actionTimer >= 3000) {
                    player.action = 'idle';
                    player.actionTimer = 0;
                }
            }
        });
    }
    
    tryIsometricMovement(currentX, currentY, dx, dy) {
        // Try horizontal movement first
        if (dx !== 0) {
            const nextX = currentX + (dx > 0 ? 1 : -1);
            if (this.isValidPlayerPosition(nextX, currentY)) {
                this.player.x = nextX;
                this.player.y = currentY;
                return;
            }
        }
        
        // Try vertical movement
        if (dy !== 0) {
            const nextY = currentY + (dy > 0 ? 1 : -1);
            if (this.isValidPlayerPosition(currentX, nextY)) {
                this.player.x = currentX;
                this.player.y = nextY;
                return;
            }
        }
        
        // If we can't move at all, stop moving
        this.player.isMoving = false;
    }
    
    
    
    placeFurniture(x, y) {
        if (!this.selectedFurniture) return;
        
        // Check if position is valid (not on walls, not occupied)
        const isValid = this.isValidFurniturePosition(x, y);
        if (!isValid) return;
        
        const furniture = {
            x: Math.floor(x),
            y: Math.floor(y),
            type: this.selectedFurniture,
            id: `furniture-${Date.now()}`
        };
        
        this.currentRoom.furniture.push(furniture);
        this.isPlacing = false;
        this.previewFurniture = null;
    }
    
    isValidFurniturePosition(x, y) {
        const floorX = Math.floor(x);
        const floorY = Math.floor(y);
        
        // Check bounds
        if (floorX < 1 || floorX >= this.currentRoom.width - 1 || 
            floorY < 1 || floorY >= this.currentRoom.height - 1) {
            return false;
        }
        
        // Check if position is already occupied
        return !this.currentRoom.furniture.some(f => f.x === floorX && f.y === floorY);
    }
    
    screenToWorld(screenX, screenY) {
        // Convert screen coordinates to isometric world coordinates
        const x = (screenX - this.canvas.width / 2) / this.tileWidth + this.camera.x;
        const y = (screenY - this.canvas.height / 2) / this.tileHeight + this.camera.y;
        return { x, y };
    }
    
    worldToScreen(worldX, worldY) {
        // Convert isometric world coordinates to screen coordinates
        const screenX = (worldX - this.camera.x) * this.tileWidth + this.canvas.width / 2;
        const screenY = (worldY - this.camera.y) * this.tileHeight + this.canvas.height / 2;
        return { x: screenX, y: screenY };
    }
    
    drawIsometricTile(x, y, color, size = 1) {
        const screenPos = this.worldToScreen(x, y);
        const width = this.tileWidth * size;
        const height = this.tileHeight * size;
        
        this.ctx.save();
        this.ctx.translate(screenPos.x, screenPos.y);
        
        // Draw isometric tile
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -height / 2);
        this.ctx.lineTo(width / 2, 0);
        this.ctx.lineTo(0, height / 2);
        this.ctx.lineTo(-width / 2, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add border
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawFurniture(furniture) {
        const type = this.furnitureTypes[furniture.type];
        if (!type) return;
        
        const screenPos = this.worldToScreen(furniture.x, furniture.y);
        const size = type.size;
        
        this.ctx.save();
        this.ctx.translate(screenPos.x, screenPos.y);
        
        // Draw furniture as isometric tile
        this.ctx.fillStyle = type.color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -this.tileHeight * size / 2);
        this.ctx.lineTo(this.tileWidth * size / 2, 0);
        this.ctx.lineTo(0, this.tileHeight * size / 2);
        this.ctx.lineTo(-this.tileWidth * size / 2, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add emoji
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(type.emoji, 0, 5);
        
        this.ctx.restore();
    }
    
    drawHoverGrid(x, y) {
        const screenPos = this.worldToScreen(x, y);
        
        this.ctx.save();
        this.ctx.translate(screenPos.x, screenPos.y);
        
        // Check if this position is valid for movement
        const isValid = this.isValidPlayerPosition(x, y);
        const color = isValid ? '#00FF00' : '#FF0000';
        
        // Draw hover grid indicator
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, -this.tileHeight / 2);
        this.ctx.lineTo(this.tileWidth / 2, 0);
        this.ctx.lineTo(0, this.tileHeight / 2);
        this.ctx.lineTo(-this.tileWidth / 2, 0);
        this.ctx.closePath();
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawPathPreview(path) {
        if (path.length < 2) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#00AAFF';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        
        // Draw path lines
        for (let i = 0; i < path.length - 1; i++) {
            const start = this.worldToScreen(path[i].x, path[i].y);
            const end = this.worldToScreen(path[i + 1].x, path[i + 1].y);
            
            this.ctx.beginPath();
            this.ctx.moveTo(start.x, start.y);
            this.ctx.lineTo(end.x, end.y);
            this.ctx.stroke();
        }
        
        // Draw path nodes
        this.ctx.fillStyle = '#00AAFF';
        this.ctx.setLineDash([]);
        for (let i = 1; i < path.length - 1; i++) {
            const pos = this.worldToScreen(path[i].x, path[i].y);
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    drawTargetIndicator(x, y) {
        const screenPos = this.worldToScreen(x, y);
        
        this.ctx.save();
        this.ctx.translate(screenPos.x, screenPos.y);
        
        // Draw pulsing target circle
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.gridSize * 0.8, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw crosshair
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.moveTo(-10, 0);
        this.ctx.lineTo(10, 0);
        this.ctx.moveTo(0, -10);
        this.ctx.lineTo(0, 10);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawPlayer(player) {
        const screenPos = this.worldToScreen(player.x, player.y);
        
        this.ctx.save();
        this.ctx.translate(screenPos.x, screenPos.y);
        
        // Draw player as circle
        this.ctx.fillStyle = player.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.gridSize * player.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add border
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Add border for current player
        if (player.id === this.currentPlayerId) {
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }
        
        // Add player emoji based on action
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#000';
        
        let emoji = '🧑';
        if (player.action === 'sitting') {
            emoji = '🪑';
        } else if (player.action === 'dancing') {
            emoji = '💃';
        } else if (player.action === 'waving') {
            emoji = '👋';
        }
        
        this.ctx.fillText(emoji, 0, 5);
        
        // Draw player name
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = player.color;
        this.ctx.fillText(player.name, 0, -this.gridSize * player.size - 10);
        
        this.ctx.restore();
    }
    
    drawMinimap() {
        this.minimapCtx.clearRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
        
        const scaleX = this.minimapCanvas.width / this.currentRoom.width;
        const scaleY = this.minimapCanvas.height / this.currentRoom.height;
        
        // Draw room
        this.minimapCtx.fillStyle = '#2d3748';
        this.minimapCtx.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
        
        // Draw walls
        this.minimapCtx.fillStyle = '#4a5568';
        this.currentRoom.walls.forEach(wall => {
            this.minimapCtx.fillRect(wall.x * scaleX, wall.y * scaleY, scaleX, scaleY);
        });
        
        // Draw furniture
        this.minimapCtx.fillStyle = '#8B4513';
        this.currentRoom.furniture.forEach(furniture => {
            this.minimapCtx.fillRect(furniture.x * scaleX, furniture.y * scaleY, scaleX, scaleY);
        });
        
        // Draw all players
        this.players.forEach((player, index) => {
            this.minimapCtx.fillStyle = player.color;
            this.minimapCtx.fillRect(player.x * scaleX, player.y * scaleY, scaleX, scaleY);
            
            // Highlight current player
            if (player.id === this.currentPlayerId) {
                this.minimapCtx.strokeStyle = '#FFD700';
                this.minimapCtx.lineWidth = 2;
                this.minimapCtx.strokeRect(player.x * scaleX, player.y * scaleY, scaleX, scaleY);
            }
        });
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.currentRoom) return;
        
        // Draw floor tiles
        for (let x = 0; x < this.currentRoom.width; x++) {
            for (let y = 0; y < this.currentRoom.height; y++) {
                // Check if this is a valid player position
                const isValidPos = this.isValidPlayerPosition(x, y);
                const floorColor = isValidPos ? '#90EE90' : '#98FB98';
                this.drawIsometricTile(x, y, floorColor, 1);
            }
        }
        
        // Draw walls
        this.currentRoom.walls.forEach(wall => {
            this.drawIsometricTile(wall.x, wall.y, '#8B4513', 1);
        });
        
        // Draw furniture
        this.currentRoom.furniture.forEach(furniture => {
            this.drawFurniture(furniture);
        });
        
        // Draw preview furniture
        if (this.previewFurniture) {
            const type = this.furnitureTypes[this.previewFurniture.type];
            if (type) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.5;
                this.drawFurniture(this.previewFurniture);
                this.ctx.restore();
            }
        }
        
        // Draw hover grid position
        if (this.currentTool === 'move' && this.hoverGridPos) {
            this.drawHoverGrid(this.hoverGridPos.x, this.hoverGridPos.y);
        }
        
        // Draw path preview
        if (this.currentTool === 'move' && this.hoverGridPos) {
            const currentPlayer = this.players[this.currentPlayerId];
            const path = this.findPath(
                Math.round(currentPlayer.x), 
                Math.round(currentPlayer.y), 
                this.hoverGridPos.x, 
                this.hoverGridPos.y,
                currentPlayer.id
            );
            this.drawPathPreview(path);
        }
        
        // Draw all players
        this.players.forEach(player => {
            this.drawPlayer(player);
            
            // Draw target indicator for moving players
            if (player.isMoving) {
                this.drawTargetIndicator(player.targetX, player.targetY);
            }
        });
        
        // Draw minimap
        this.drawMinimap();
    }
    
    gameLoop() {
        this.updatePlayerMovement();
        this.updatePlayerActions();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new IsoGame();
});

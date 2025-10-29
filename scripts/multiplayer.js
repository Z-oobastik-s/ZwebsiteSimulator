/**
 * Multiplayer Mode - Real-time typing competition
 * Uses Firebase Realtime Database
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp, remove, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Multiplayer state
const multiplayerState = {
    roomCode: null,
    playerId: null,
    playerNumber: null, // 1 or 2
    opponentId: null,
    isHost: false,
    gameStarted: false,
    gameText: '',
    myProgress: 0,
    opponentProgress: 0,
    gameEnded: false
};

// Generate unique room code
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Generate unique player ID
function generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Create new room
export async function createRoom() {
    const roomCode = generateRoomCode();
    const playerId = generatePlayerId();
    
    multiplayerState.roomCode = roomCode;
    multiplayerState.playerId = playerId;
    multiplayerState.isHost = true;
    multiplayerState.playerNumber = 1;
    
    // Generate game text (random words)
    const words = window.app?.currentLayout === 'en' 
        ? ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day']
        : ['как', 'так', 'все', 'это', 'был', 'она', 'они', 'мой', 'его', 'что', 'год', 'дом', 'день', 'раз', 'рука'];
    
    const gameText = [];
    for (let i = 0; i < 30; i++) {
        gameText.push(words[Math.floor(Math.random() * words.length)]);
    }
    multiplayerState.gameText = gameText.join(' ');
    
    // Create room in database
    const roomRef = ref(database, `rooms/${roomCode}`);
    await set(roomRef, {
        host: playerId,
        players: {
            [playerId]: {
                id: playerId,
                number: 1,
                ready: true,
                progress: 0,
                finished: false,
                lastUpdate: serverTimestamp()
            }
        },
        gameText: multiplayerState.gameText,
        started: false,
        createdAt: serverTimestamp()
    });
    
    // Setup disconnect handler
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    onDisconnect(playerRef).remove();
    
    // Listen for opponent
    listenToRoom(roomCode);
    
    return roomCode;
}

// Join existing room
export async function joinRoom(roomCode) {
    const playerId = generatePlayerId();
    
    // Check if room exists
    const roomRef = ref(database, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
        throw new Error('Комната не найдена');
    }
    
    const roomData = snapshot.val();
    const playerCount = Object.keys(roomData.players || {}).length;
    
    if (playerCount >= 2) {
        throw new Error('Комната полная');
    }
    
    if (roomData.started) {
        throw new Error('Игра уже началась');
    }
    
    multiplayerState.roomCode = roomCode;
    multiplayerState.playerId = playerId;
    multiplayerState.isHost = false;
    multiplayerState.playerNumber = 2;
    multiplayerState.gameText = roomData.gameText;
    
    // Add player to room
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    await set(playerRef, {
        id: playerId,
        number: 2,
        ready: true,
        progress: 0,
        finished: false,
        lastUpdate: serverTimestamp()
    });
    
    // Setup disconnect handler
    onDisconnect(playerRef).remove();
    
    // Listen to room
    listenToRoom(roomCode);
    
    return roomCode;
}

// Listen to room updates
function listenToRoom(roomCode) {
    const roomRef = ref(database, `rooms/${roomCode}`);
    
    onValue(roomRef, (snapshot) => {
        if (!snapshot.exists()) {
            // Room deleted
            if (window.onMultiplayerRoomDeleted) {
                window.onMultiplayerRoomDeleted();
            }
            return;
        }
        
        const roomData = snapshot.val();
        const players = roomData.players || {};
        const playerIds = Object.keys(players);
        
        // Find opponent
        const opponentId = playerIds.find(id => id !== multiplayerState.playerId);
        if (opponentId) {
            multiplayerState.opponentId = opponentId;
            multiplayerState.opponentProgress = players[opponentId].progress || 0;
            
            // Check if opponent finished
            if (players[opponentId].finished && !multiplayerState.gameEnded) {
                if (window.onOpponentFinished) {
                    window.onOpponentFinished();
                }
            }
        }
        
        // Update UI with player count
        if (window.onMultiplayerUpdate) {
            window.onMultiplayerUpdate({
                playerCount: playerIds.length,
                started: roomData.started,
                opponentProgress: multiplayerState.opponentProgress
            });
        }
        
        // Start game when both players ready
        if (playerIds.length === 2 && !roomData.started && multiplayerState.isHost) {
            // Auto-start after 3 seconds
            setTimeout(async () => {
                const currentSnapshot = await get(roomRef);
                if (currentSnapshot.exists() && !currentSnapshot.val().started) {
                    await update(roomRef, { started: true });
                    if (window.onMultiplayerStart) {
                        window.onMultiplayerStart(multiplayerState.gameText);
                    }
                }
            }, 3000);
        }
        
        // Notify when game starts
        if (roomData.started && !multiplayerState.gameStarted) {
            multiplayerState.gameStarted = true;
            if (window.onMultiplayerStart) {
                window.onMultiplayerStart(multiplayerState.gameText);
            }
        }
    });
}

// Update player progress
export async function updateProgress(progress) {
    if (!multiplayerState.roomCode || !multiplayerState.playerId) return;
    
    multiplayerState.myProgress = progress;
    
    const playerRef = ref(database, `rooms/${multiplayerState.roomCode}/players/${multiplayerState.playerId}`);
    await update(playerRef, {
        progress: progress,
        lastUpdate: serverTimestamp()
    });
}

// Mark player as finished
export async function finishGame() {
    if (!multiplayerState.roomCode || !multiplayerState.playerId) return;
    
    multiplayerState.gameEnded = true;
    
    const playerRef = ref(database, `rooms/${multiplayerState.roomCode}/players/${multiplayerState.playerId}`);
    await update(playerRef, {
        finished: true,
        progress: 100,
        finishedAt: serverTimestamp()
    });
}

// Leave room
export async function leaveRoom() {
    if (!multiplayerState.roomCode || !multiplayerState.playerId) return;
    
    const playerRef = ref(database, `rooms/${multiplayerState.roomCode}/players/${multiplayerState.playerId}`);
    await remove(playerRef);
    
    // If host, delete entire room
    if (multiplayerState.isHost) {
        const roomRef = ref(database, `rooms/${multiplayerState.roomCode}`);
        await remove(roomRef);
    }
    
    // Reset state
    multiplayerState.roomCode = null;
    multiplayerState.playerId = null;
    multiplayerState.opponentId = null;
    multiplayerState.isHost = false;
    multiplayerState.gameStarted = false;
    multiplayerState.gameEnded = false;
    multiplayerState.myProgress = 0;
    multiplayerState.opponentProgress = 0;
}

// Get current state
export function getMultiplayerState() {
    return { ...multiplayerState };
}

// Check if in multiplayer mode
export function isMultiplayerActive() {
    return multiplayerState.roomCode !== null;
}

// Export for global access
window.multiplayerModule = {
    createRoom,
    joinRoom,
    updateProgress,
    finishGame,
    leaveRoom,
    getMultiplayerState,
    isMultiplayerActive
};


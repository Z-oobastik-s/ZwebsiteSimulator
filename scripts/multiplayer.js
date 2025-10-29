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

// Text library for themed texts
const textLibrary = {
    anime: {
        ru: "Наруто Узумаки мечтал стать хокаге чтобы все признали его силу верил в друзей даже когда казалось что надежды нет сила воли помогла ему преодолеть все трудности и стать сильнейшим ниндзя в деревне Коноха",
        en: "Naruto Uzumaki dreamed of becoming hokage so everyone would recognize his strength believed in friends even when hope seemed lost willpower helped him overcome all difficulties and become the strongest ninja in Konoha village"
    },
    games: {
        ru: "В мире компьютерных игр существует множество жанров от шутеров до стратегий каждый игрок может найти что-то по душе соревнования киберспорт объединяют миллионы людей по всему миру создавая уникальную культуру и сообщество геймеров",
        en: "In the world of computer games there are many genres from shooters to strategies each player can find something to their liking competitions esports unite millions of people around the world creating a unique culture and community of gamers"
    },
    animals: {
        ru: "Животные населяют нашу планету миллионы лет от крошечных насекомых до огромных слонов каждый вид уникален и важен для экосистемы дельфины умны как люди а колибри машут крыльями восемьдесят раз в секунду природа удивительна",
        en: "Animals have inhabited our planet for millions of years from tiny insects to huge elephants each species is unique and important for the ecosystem dolphins are as smart as humans and hummingbirds flap their wings eighty times per second nature is amazing"
    },
    space: {
        ru: "Космос бесконечен и полон загадок звёзды рождаются и умирают чёрные дыры поглощают всё вокруг галактики сталкиваются создавая новые миры человечество только начинает исследовать вселенную мечтая о путешествиях к далёким планетам и встрече с инопланетными цивилизациями",
        en: "Space is infinite and full of mysteries stars are born and die black holes absorb everything around galaxies collide creating new worlds humanity is just beginning to explore the universe dreaming of traveling to distant planets and meeting alien civilizations"
    },
    war: {
        ru: "Война это страшное испытание для человечества принося разрушения и страдания история помнит великие сражения где решались судьбы народов храбрость солдат подвиги героев вечная память павшим мир это величайшая ценность которую нужно беречь любой ценой",
        en: "War is a terrible test for humanity bringing destruction and suffering history remembers great battles where the fates of nations were decided courage of soldiers feats of heroes eternal memory to the fallen peace is the greatest value that must be protected at any cost"
    },
    nature: {
        ru: "Природа создала удивительные ландшафты высокие горы глубокие океаны бескрайние леса и жаркие пустыни каждая экосистема уникальна реки текут к морям деревья очищают воздух цветы радуют глаз птицы поют песни человек должен заботиться о планете сохраняя её красоту для будущих поколений",
        en: "Nature has created amazing landscapes high mountains deep oceans endless forests and hot deserts each ecosystem is unique rivers flow to the seas trees purify the air flowers delight the eye birds sing songs humans must take care of the planet preserving its beauty for future generations"
    }
};

function getThemedText(theme, layout, wordCount) {
    const text = textLibrary[theme]?.[layout] || textLibrary[theme]?.ru;
    if (!text) return null;
    
    const words = text.split(' ');
    const selectedWords = [];
    
    // Если запрошено больше слов чем есть в тексте, повторяем
    for (let i = 0; i < wordCount; i++) {
        selectedWords.push(words[i % words.length]);
    }
    
    return selectedWords.join(' ');
}

// Create new room
export async function createRoom(wordCount = 50, theme = 'random', layout = 'ru') {
    const roomCode = generateRoomCode();
    const playerId = generatePlayerId();
    
    multiplayerState.roomCode = roomCode;
    multiplayerState.playerId = playerId;
    multiplayerState.isHost = true;
    multiplayerState.playerNumber = 1;
    
    // Generate game text
    let gameText;
    
    if (theme !== 'random' && textLibrary[theme]) {
        // Use themed text
        gameText = getThemedText(theme, layout, wordCount);
    }
    
    if (!gameText) {
        // Fallback to random words
        const words = layout === 'en' 
        ? ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'time', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'work', 'year', 'back', 'call', 'come', 'made', 'make', 'more', 'over', 'such', 'take', 'than', 'them', 'then', 'very', 'well', 'when', 'your']
        : layout === 'ua'
        ? ['як', 'так', 'все', 'це', 'був', 'вона', 'вони', 'мій', 'його', 'що', 'рік', 'дім', 'день', 'раз', 'рука', 'нога', 'мама', 'тато', 'вода', 'небо', 'земля', 'місто', 'стіл', 'вікно', 'двері', 'книга', 'лампа', 'стілець', 'друг', 'життя', 'час', 'люди', 'справа', 'місце', 'слово', 'сторона', 'питання', 'робота', 'школа', 'дитина', 'батько', 'сестра', 'брат', 'країна', 'мова', 'дерево', 'квітка', 'сонце', 'місяць', 'зірка']
        : ['как', 'так', 'все', 'это', 'был', 'она', 'они', 'мой', 'его', 'что', 'год', 'дом', 'день', 'раз', 'рука', 'нога', 'мама', 'папа', 'вода', 'небо', 'земля', 'город', 'стол', 'окно', 'дверь', 'книга', 'лампа', 'стул', 'друг', 'жизнь', 'время', 'человек', 'дело', 'место', 'слово', 'сторона', 'вопрос', 'работа', 'школа', 'ребенок', 'отец', 'мать', 'брат', 'сестра', 'страна', 'язык', 'дерево', 'цветок', 'солнце', 'луна', 'звезда'];
        
        const randomWords = [];
        for (let i = 0; i < wordCount; i++) {
            randomWords.push(words[Math.floor(Math.random() * words.length)]);
        }
        gameText = randomWords.join(' ');
    }
    
    multiplayerState.gameText = gameText;
    
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


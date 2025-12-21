/**
 * Authentication Module
 * Все данные хранятся в localStorage
 */

// Available profile avatars
export const AVAILABLE_AVATARS = [
    'assets/images/profile photo/profile_1.png',
    'assets/images/profile photo/profile_2.jpg',
    'assets/images/profile photo/profile_3.jpg',
    'assets/images/profile photo/profile_4.jpg',
    'assets/images/profile photo/profile_5.jpg',
    'assets/images/profile photo/profile_6.jpg'
];

// Storage keys
const STORAGE_KEY_USERS = 'zwebsitesimulator_users';
const STORAGE_KEY_CURRENT_USER = 'zwebsitesimulator_current_user';

// Password hashing
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get all users from localStorage
function getAllUsersStorage() {
    try {
        const usersJson = localStorage.getItem(STORAGE_KEY_USERS);
        return usersJson ? JSON.parse(usersJson) : {};
    } catch (e) {
        return {};
    }
}

// Save all users to localStorage
function saveAllUsersStorage(users) {
    try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        return true;
    } catch (e) {
        console.error('Failed to save users:', e);
        return false;
    }
}

// Get current user from localStorage
function getCurrentUserFromStorage() {
    try {
        const userJson = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
        return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
        return null;
    }
}

// Save current user to localStorage
function saveCurrentUserToStorage(user) {
    try {
        if (user) {
            localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
        } else {
            localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
        }
        return true;
    } catch (e) {
        console.error('Failed to save current user:', e);
        return false;
    }
}

// Get user's IP and country
async function getUserInfo() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
            ip: data.ip || 'unknown',
            country: data.country_name || 'unknown',
            city: data.city || 'unknown'
        };
    } catch (e) {
        return {
            ip: 'unknown',
            country: 'unknown',
            city: 'unknown'
        };
    }
}

// Generate unique user ID
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Register new user
export async function registerUser(username, password, email = '') {
    try {
        if (!username || !password) {
            return { success: false, error: 'Логин и пароль обязательны' };
        }
        
        if (username.length < 3) {
            return { success: false, error: 'Логин должен быть не менее 3 символов' };
        }
        
        if (password.length < 6) {
            return { success: false, error: 'Пароль должен быть не менее 6 символов' };
        }
        
        const users = getAllUsersStorage();
        const existingUser = Object.values(users).find(u => u.username === username);
        if (existingUser) {
            return { success: false, error: 'Этот логин уже занят' };
        }
        
        const userInfo = await getUserInfo();
        const hashedPassword = await hashPassword(password);
        const uid = generateUserId();
        
        const user = {
            uid: uid,
            username: username,
            displayName: username,
            passwordHash: hashedPassword,
            email: email || '',
            photoURL: AVAILABLE_AVATARS[0],
            avatarIndex: 0,
            bio: '',
            createdAt: Date.now(),
            lastLogin: Date.now(),
            ip: userInfo.ip,
            country: userInfo.country,
            city: userInfo.city,
            isAdmin: false,
            balance: 0,
            purchasedLessons: [],
            stats: {
                totalSessions: 0,
                totalTime: 0,
                bestSpeed: 0,
                averageAccuracy: 0,
                completedLessons: 0,
                totalErrors: 0,
                sessions: []
            }
        };
        
        users[uid] = user;
        if (!saveAllUsersStorage(users)) {
            return { success: false, error: 'Ошибка сохранения данных' };
        }
        
        saveCurrentUserToStorage(user);
        return { success: true, user: user };
    } catch (error) {
        return { success: false, error: error.message || 'Ошибка регистрации' };
    }
}

// Login user
export async function loginUser(username, password) {
    try {
        if (!username || !password) {
            return { success: false, error: 'Введите логин и пароль' };
        }
        
        const users = getAllUsersStorage();
        const user = Object.values(users).find(u => u.username === username);
        
        if (!user) {
            return { success: false, error: 'Неверный логин или пароль' };
        }
        
        const hashedPassword = await hashPassword(password);
        if (user.passwordHash !== hashedPassword) {
            return { success: false, error: 'Неверный логин или пароль' };
        }
        
        const userInfo = await getUserInfo();
        user.lastLogin = Date.now();
        user.ip = userInfo.ip;
        user.country = userInfo.country;
        user.city = userInfo.city;
        
        users[user.uid] = user;
        if (!saveAllUsersStorage(users)) {
            return { success: false, error: 'Ошибка сохранения данных' };
        }
        
        saveCurrentUserToStorage(user);
        return { success: true, user: user };
    } catch (error) {
        return { success: false, error: error.message || 'Ошибка входа' };
    }
}

// Logout user
export async function logoutUser() {
    try {
        saveCurrentUserToStorage(null);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get current user
export function getCurrentUser() {
    return getCurrentUserFromStorage();
}

// Get user profile
export async function getUserProfile(uid) {
    try {
        const users = getAllUsersStorage();
        const user = users[uid];
        if (user) {
            return { success: true, data: user };
        }
        return { success: false, error: 'User not found' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update user profile
export async function updateUserProfile(uid, updates) {
    try {
        const users = getAllUsersStorage();
        const user = users[uid];
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        
        Object.assign(user, updates);
        users[uid] = user;
        
        if (!saveAllUsersStorage(users)) {
            return { success: false, error: 'Ошибка сохранения данных' };
        }
        
        const currentUser = getCurrentUserFromStorage();
        if (currentUser && currentUser.uid === uid) {
            saveCurrentUserToStorage(user);
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update profile avatar
export async function updateProfileAvatar(uid, avatarIndex) {
    try {
        if (avatarIndex < 0 || avatarIndex >= AVAILABLE_AVATARS.length) {
            return { success: false, error: 'Неверный индекс аватара' };
        }
        
        const avatarURL = AVAILABLE_AVATARS[avatarIndex];
        const result = await updateUserProfile(uid, { photoURL: avatarURL, avatarIndex: avatarIndex });
        
        if (result.success) {
            return { success: true, photoURL: avatarURL };
        }
        
        return result;
    } catch (error) {
        return { success: false, error: error.message || 'Ошибка обновления аватара' };
    }
}

// Session queue for batch updates
let sessionQueue = [];
let sessionUpdateTimeout = null;

// Debounced session update
function debouncedSessionUpdate(uid) {
    if (sessionUpdateTimeout) {
        clearTimeout(sessionUpdateTimeout);
    }
    
    sessionUpdateTimeout = setTimeout(() => {
        if (sessionQueue.length === 0) return;
        
        const sessionsToProcess = [...sessionQueue];
        sessionQueue = [];
        
        try {
            const users = getAllUsersStorage();
            const user = users[uid];
            if (!user) return;
            
            const currentStats = user.stats || {};
            const sessions = currentStats.sessions || [];
            
            sessionsToProcess.forEach(sessionData => {
                sessions.push({
                    ...sessionData,
                    timestamp: Date.now()
                });
            });
            
            const totalSessions = sessions.length;
            const totalTime = sessionsToProcess.reduce((sum, s) => sum + (s.time || 0), currentStats.totalTime || 0);
            const bestSpeed = Math.max(
                currentStats.bestSpeed || 0,
                ...sessionsToProcess.map(s => s.speed || 0)
            );
            const totalErrors = sessionsToProcess.reduce((sum, s) => sum + (s.errors || 0), currentStats.totalErrors || 0);
            const totalAccuracy = sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0);
            const averageAccuracy = totalSessions > 0 ? Math.round(totalAccuracy / totalSessions) : 0;
            const completedLessons = new Set(
                sessions.filter(s => s.lessonKey).map(s => s.lessonKey)
            ).size;
            
            user.stats = {
                totalSessions,
                totalTime,
                bestSpeed,
                averageAccuracy,
                completedLessons,
                totalErrors,
                sessions: sessions.slice(-100)
            };
            
            users[uid] = user;
            saveAllUsersStorage(users);
            
            const currentUser = getCurrentUserFromStorage();
            if (currentUser && currentUser.uid === uid) {
                saveCurrentUserToStorage(user);
            }
        } catch (error) {
            console.error('Failed to update user session:', error);
        }
    }, 2000);
}

// Add session to user stats
export async function addUserSession(uid, sessionData) {
    sessionQueue.push(sessionData);
    debouncedSessionUpdate(uid);
    return { success: true };
}

// Check if user is admin
export async function isAdmin(uid) {
    try {
        const users = getAllUsersStorage();
        const user = users[uid];
        return user ? user.isAdmin === true : false;
    } catch (error) {
        return false;
    }
}

// Get all users (admin only)
export async function getAllUsers() {
    try {
        const users = getAllUsersStorage();
        const usersList = Object.values(users).map(user => ({
            id: user.uid,
            ...user
        }));
        return { success: true, users: usersList };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Delete user (admin only)
export async function deleteUser(uid) {
    try {
        const users = getAllUsersStorage();
        delete users[uid];
        if (!saveAllUsersStorage(users)) {
            return { success: false, error: 'Ошибка сохранения данных' };
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Auth state observer (simulate Firebase onAuthStateChanged)
let authStateListeners = [];
let currentAuthUser = null;

function notifyAuthStateListeners(user) {
    currentAuthUser = user;
    authStateListeners.forEach(callback => {
        try {
            callback(user);
        } catch (e) {
            console.error('Auth state listener error:', e);
        }
    });
}

// Check auth state on load
function checkAuthState() {
    const user = getCurrentUserFromStorage();
    if (user !== currentAuthUser) {
        notifyAuthStateListeners(user);
    }
}

// Check auth state periodically
setInterval(checkAuthState, 1000);

// Initial check
checkAuthState();

// Auth state observer
export function onAuthStateChange(callback) {
    authStateListeners.push(callback);
    // Immediately call with current user
    const user = getCurrentUserFromStorage();
    if (user) {
        setTimeout(() => callback(user), 0);
    }
    // Return unsubscribe function
    return () => {
        authStateListeners = authStateListeners.filter(cb => cb !== callback);
    };
}

// Add coins to user balance (начисление монет за урок)
export async function addCoins(uid, amount) {
    try {
        const users = getAllUsersStorage();
        const user = users[uid];
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        
        if (!user.balance) user.balance = 0;
        user.balance += amount;
        
        users[uid] = user;
        if (!saveAllUsersStorage(users)) {
            return { success: false, error: 'Ошибка сохранения данных' };
        }
        
        const currentUser = getCurrentUserFromStorage();
        if (currentUser && currentUser.uid === uid) {
            saveCurrentUserToStorage(user);
        }
        
        return { success: true, balance: user.balance };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Purchase lesson (покупка урока)
export async function purchaseLesson(uid, lessonId) {
    try {
        const users = getAllUsersStorage();
        const user = users[uid];
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        
        if (!user.balance) user.balance = 0;
        if (!user.purchasedLessons) user.purchasedLessons = [];
        
        // Проверяем что урок уже не куплен
        if (user.purchasedLessons.includes(lessonId)) {
            return { success: false, error: 'Урок уже куплен' };
        }
        
        // Получаем цену урока из магазина
        const shopLesson = window.shopModule?.getLessonById(lessonId);
        if (!shopLesson) {
            return { success: false, error: 'Урок не найден в магазине' };
        }
        
        if (user.balance < shopLesson.price) {
            return { success: false, error: 'Недостаточно монет' };
        }
        
        // Списываем монеты и добавляем урок
        user.balance -= shopLesson.price;
        user.purchasedLessons.push(lessonId);
        
        users[uid] = user;
        if (!saveAllUsersStorage(users)) {
            return { success: false, error: 'Ошибка сохранения данных' };
        }
        
        const currentUser = getCurrentUserFromStorage();
        if (currentUser && currentUser.uid === uid) {
            saveCurrentUserToStorage(user);
        }
        
        return { success: true, balance: user.balance };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get user balance
export function getUserBalance(uid) {
    try {
        const users = getAllUsersStorage();
        const user = users[uid];
        return user ? (user.balance || 0) : 0;
    } catch (error) {
        return 0;
    }
}

// Check if lesson is purchased
export function isLessonPurchased(uid, lessonId) {
    try {
        const users = getAllUsersStorage();
        const user = users[uid];
        if (!user || !user.purchasedLessons) return false;
        return user.purchasedLessons.includes(lessonId);
    } catch (error) {
        return false;
    }
}

// Export for global access
window.authModule = {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    getUserProfile,
    updateUserProfile,
    updateProfileAvatar,
    AVAILABLE_AVATARS,
    addUserSession,
    isAdmin,
    getAllUsers,
    deleteUser,
    onAuthStateChange,
    addCoins,
    purchaseLesson,
    getUserBalance,
    isLessonPurchased
};

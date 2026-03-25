/**
 * Authentication Module
 * Режим 1: window.API_BASE_URL задан - данные в MSSQL через backend API.
 * Режим 2: API_BASE_URL пустой - данные в localStorage (как раньше).
 */

export const AVAILABLE_AVATARS = [
    'assets/images/profile photo/profile_1.png',
    'assets/images/profile photo/profile_2.jpg',
    'assets/images/profile photo/profile_3.jpg',
    'assets/images/profile photo/profile_4.jpg',
    'assets/images/profile photo/profile_5.jpg',
    'assets/images/profile photo/profile_6.jpg',
    'assets/images/profile photo/profile_7.jpg',
    'assets/images/profile photo/profile_8.jpg',
    'assets/images/profile photo/profile_9.jpg',
    'assets/images/profile photo/profile_10.jpg',
    'assets/images/profile photo/profile_11.jpg',
    'assets/images/profile photo/profile_12.jpg',
    'assets/images/profile photo/profile_13.jpg',
    'assets/images/profile photo/profile_14.jpg',
    'assets/images/profile photo/profile_15.jpg',
    'assets/images/profile photo/profile_16.jpg',
    'assets/images/profile photo/profile_17.jpg',
    'assets/images/profile photo/profile_18.jpg',
    'assets/images/profile photo/profile_19.jpg',
    'assets/images/profile photo/profile_20.jpg'
];

/** Минимальный уровень для разблокировки аватара (0 = доступен с первого уровня). */
export const AVATAR_UNLOCK_LEVELS = [
    0, 0, 0, 5, 5, 10,   // 1–6
    12, 12, 15, 15, 18, 18, 21, 21, 24, 24, 27, 27, 30, 30   // 7–20
];

const STORAGE_KEY_USERS = 'zwebsitesimulator_users';
const STORAGE_KEY_CURRENT_USER = 'zwebsitesimulator_current_user';
const STORAGE_KEY_TOKEN = 'zwebsitesimulator_token';

function useApi() {
    return typeof window !== 'undefined' && window.API_BASE_URL && window.API_BASE_URL.trim() !== '';
}

function getToken() {
    try {
        return localStorage.getItem(STORAGE_KEY_TOKEN);
    } catch (e) {
        return null;
    }
}

async function apiFetch(path, options = {}) {
    const base = (window.API_BASE_URL || '').replace(/\/$/, '');
    const url = base + path;
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data.error || res.statusText || 'API Error');
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}

function fallbackHash(password) {
    let h = 0;
    const s = String(password);
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    const part = Math.abs(h).toString(16).padStart(8, '0');
    return (part + part + part + part + part + part + part + part).slice(0, 64);
}

async function hashPassword(password) {
    const s = String(password || '');
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(s);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            return fallbackHash(s);
        }
    }
    return fallbackHash(s);
}

function getAllUsersStorage() {
    try {
        const usersJson = localStorage.getItem(STORAGE_KEY_USERS);
        return usersJson ? JSON.parse(usersJson) : {};
    } catch (e) {
        return {};
    }
}

function saveAllUsersStorage(users) {
    try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        return true;
    } catch (e) {
        console.error('Failed to save users:', e);
        return false;
    }
}

function getCurrentUserFromStorage() {
    try {
        const userJson = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
        return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
        return null;
    }
}

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

function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// --------------- Регистрация ---------------
export async function registerUser(username, password, email = '') {
    if (!username || !password) {
        return { success: false, error: 'Логин и пароль обязательны' };
    }
    if (username.length < 3) {
        return { success: false, error: 'Логин должен быть не менее 3 символов' };
    }
    if (password.length < 6) {
        return { success: false, error: 'Пароль должен быть не менее 6 символов' };
    }

    if (useApi()) {
        try {
            const data = await apiFetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, password, email: email || '' })
            });
            if (data.token) localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
            if (data.user) saveCurrentUserToStorage(data.user);
            notifyAuthStateListeners(data.user);
            return { success: true, user: data.user };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message || 'Ошибка регистрации' };
        }
    }

    const users = getAllUsersStorage();
    if (Object.values(users).some(u => u.username === username)) {
        return { success: false, error: 'Этот логин уже занят' };
    }
    const hashedPassword = await hashPassword(password);
    const uid = generateUserId();
    const user = {
        uid, username, displayName: username, passwordHash: hashedPassword, email: email || '',
        photoURL: AVAILABLE_AVATARS[0], avatarIndex: 0, bio: '', createdAt: Date.now(), lastLogin: Date.now(),
        isAdmin: false, balance: 50, purchasedLessons: [],
        stats: { totalSessions: 0, totalTime: 0, bestSpeed: 0, averageAccuracy: 0, completedLessons: 0, totalErrors: 0, sessions: [] }
    };
    users[uid] = user;
    if (!saveAllUsersStorage(users)) return { success: false, error: 'Ошибка сохранения данных' };
    saveCurrentUserToStorage(user);
    notifyAuthStateListeners(user);
    return { success: true, user };
}

// --------------- Вход ---------------
export async function loginUser(username, password) {
    if (!username || !password) {
        return { success: false, error: 'Введите логин и пароль' };
    }

    if (useApi()) {
        try {
            const data = await apiFetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            if (data.token) localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
            if (data.user) saveCurrentUserToStorage(data.user);
            notifyAuthStateListeners(data.user);
            return { success: true, user: data.user };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message || 'Неверный логин или пароль' };
        }
    }

    const users = getAllUsersStorage();
    const user = Object.values(users).find(u => u.username === username);
    if (!user) return { success: false, error: 'Неверный логин или пароль' };
    const hashedPassword = await hashPassword(password);
    if (user.passwordHash !== hashedPassword) return { success: false, error: 'Неверный логин или пароль' };
    user.lastLogin = Date.now();
    users[user.uid] = user;
    if (!saveAllUsersStorage(users)) return { success: false, error: 'Ошибка сохранения данных' };
    saveCurrentUserToStorage(user);
    notifyAuthStateListeners(user);
    return { success: true, user };
}

// --------------- Выход ---------------
export async function logoutUser() {
    if (useApi()) {
        try {
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            saveCurrentUserToStorage(null);
            notifyAuthStateListeners(null);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    saveCurrentUserToStorage(null);
    notifyAuthStateListeners(null);
    return { success: true };
}

// --------------- Текущий пользователь ---------------
export function getCurrentUser() {
    return getCurrentUserFromStorage();
}

// --------------- Профиль ---------------
export async function getUserProfile(uid) {
    if (useApi()) {
        try {
            const data = await apiFetch(`/api/users/${uid}/profile`);
            return { success: true, data: data.data };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message };
        }
    }
    const users = getAllUsersStorage();
    const user = users[uid];
    return user ? { success: true, data: user } : { success: false, error: 'User not found' };
}

export async function updateUserProfile(uid, updates) {
    if (useApi()) {
        try {
            const data = await apiFetch(`/api/users/${uid}/profile`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            if (data.user) saveCurrentUserToStorage(data.user);
            notifyAuthStateListeners(data.user);
            return { success: true };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message };
        }
    }
    const users = getAllUsersStorage();
    const user = users[uid];
    if (!user) return { success: false, error: 'User not found' };
    Object.assign(user, updates);
    users[uid] = user;
    if (!saveAllUsersStorage(users)) return { success: false, error: 'Ошибка сохранения данных' };
    const current = getCurrentUserFromStorage();
    if (current && current.uid === uid) saveCurrentUserToStorage(user);
    return { success: true };
}

export async function updateProfileAvatar(uid, avatarIndex) {
    if (avatarIndex < 0 || avatarIndex >= AVAILABLE_AVATARS.length) {
        return { success: false, error: 'Неверный индекс аватара' };
    }
    const photoURL = AVAILABLE_AVATARS[avatarIndex];
    if (useApi()) {
        try {
            const data = await apiFetch(`/api/users/${uid}/avatar`, {
                method: 'PUT',
                body: JSON.stringify({ avatarIndex, photoURL })
            });
            const user = getCurrentUserFromStorage();
            if (user && user.uid === uid) {
                user.photoURL = photoURL;
                user.avatarIndex = avatarIndex;
                saveCurrentUserToStorage(user);
                notifyAuthStateListeners(user);
            }
            return { success: true, photoURL };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message };
        }
    }
    return updateUserProfile(uid, { photoURL, avatarIndex }).then(r => r.success ? { success: true, photoURL } : r);
}

// --------------- Сессии (прогресс) ---------------
let sessionQueue = [];
let sessionUpdateTimeout = null;

function debouncedSessionUpdate(uid) {
    if (sessionUpdateTimeout) clearTimeout(sessionUpdateTimeout);
    sessionUpdateTimeout = setTimeout(async () => {
        if (sessionQueue.length === 0) return;
        const batch = [...sessionQueue];
        sessionQueue = [];

        if (useApi()) {
            try {
                await apiFetch(`/api/users/${uid}/sessions`, {
                    method: 'POST',
                    body: JSON.stringify(batch)
                });
                const data = await apiFetch('/api/auth/me');
                if (data.user) {
                    saveCurrentUserToStorage(data.user);
                    notifyAuthStateListeners(data.user);
                }
            } catch (e) {
                console.error('Failed to update user session:', e);
            }
            return;
        }

        try {
            const users = getAllUsersStorage();
            const user = users[uid];
            if (!user) return;
            const currentStats = user.stats || {};
            const sessions = currentStats.sessions || [];
            batch.forEach(s => sessions.push({ ...s, timestamp: Date.now() }));
            const totalSessions = sessions.length;
            const totalTime = batch.reduce((sum, s) => sum + (s.time || 0), currentStats.totalTime || 0);
            const bestSpeed = Math.max(currentStats.bestSpeed || 0, ...batch.map(s => s.speed || 0));
            const totalErrors = batch.reduce((sum, s) => sum + (s.errors || 0), currentStats.totalErrors || 0);
            const totalAccuracy = sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0);
            const averageAccuracy = totalSessions > 0 ? Math.round(totalAccuracy / totalSessions) : 0;
            const completedLessons = new Set(sessions.filter(s => s.lessonKey).map(s => s.lessonKey)).size;
            user.stats = {
                totalSessions, totalTime, bestSpeed, averageAccuracy, completedLessons, totalErrors,
                sessions: sessions.slice(-100)
            };
            users[uid] = user;
            saveAllUsersStorage(users);
            const current = getCurrentUserFromStorage();
            if (current && current.uid === uid) saveCurrentUserToStorage(user);
        } catch (e) {
            console.error('Failed to update user session:', e);
        }
    }, 2000);
}

export async function addUserSession(uid, sessionData) {
    sessionQueue.push(sessionData);
    debouncedSessionUpdate(uid);
    return { success: true };
}

// --------------- Админ ---------------
export async function isAdmin(uid) {
    if (useApi()) {
        const user = getCurrentUserFromStorage();
        return user && user.uid === uid && user.isAdmin === true;
    }
    const users = getAllUsersStorage();
    const user = users[uid];
    return user ? user.isAdmin === true : false;
}

export async function getAllUsers() {
    if (useApi()) {
        try {
            const data = await apiFetch('/api/admin/users');
            return { success: true, users: data.users };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message };
        }
    }
    const users = getAllUsersStorage();
    return { success: true, users: Object.values(users).map(u => ({ id: u.uid, ...u })) };
}

export async function deleteUser(uid) {
    if (useApi()) {
        try {
            await apiFetch(`/api/admin/users/${uid}`, { method: 'DELETE' });
            return { success: true };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message };
        }
    }
    const users = getAllUsersStorage();
    delete users[uid];
    if (!saveAllUsersStorage(users)) return { success: false, error: 'Ошибка сохранения данных' };
    return { success: true };
}

// --------------- Слушатель авторизации ---------------
let authStateListeners = [];
let currentAuthUser = null;

function notifyAuthStateListeners(user) {
    currentAuthUser = user;
    authStateListeners.forEach(cb => {
        try { cb(user); } catch (e) { console.error('Auth state listener error:', e); }
    });
}

function checkAuthState() {
    const user = getCurrentUserFromStorage();
    if (user !== currentAuthUser) notifyAuthStateListeners(user);
}

checkAuthState();

// При использовании API: если есть токен, но нет пользователя в кэше - подгрузить с сервера
if (useApi() && getToken() && !getCurrentUserFromStorage()) {
    apiFetch('/api/auth/me').then(data => {
        if (data.user) {
            saveCurrentUserToStorage(data.user);
            notifyAuthStateListeners(data.user);
        }
    }).catch(() => {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
    });
}

export function onAuthStateChange(callback) {
    authStateListeners.push(callback);
    const user = getCurrentUserFromStorage();
    if (user) setTimeout(() => callback(user), 0);
    return () => { authStateListeners = authStateListeners.filter(cb => cb !== callback); };
}

// --------------- Монеты и магазин ---------------
export async function addCoins(uid, amount) {
    if (useApi()) {
        try {
            const data = await apiFetch(`/api/users/${uid}/coins`, {
                method: 'POST',
                body: JSON.stringify({ amount })
            });
            const user = getCurrentUserFromStorage();
            if (user && user.uid === uid) {
                user.balance = data.balance;
                saveCurrentUserToStorage(user);
                notifyAuthStateListeners(user);
            }
            return { success: true, balance: data.balance };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message };
        }
    }
    const users = getAllUsersStorage();
    const user = users[uid];
    if (!user) return { success: false, error: 'User not found' };
    user.balance = (user.balance || 0) + amount;
    users[uid] = user;
    if (!saveAllUsersStorage(users)) return { success: false, error: 'Ошибка сохранения данных' };
    const current = getCurrentUserFromStorage();
    if (current && current.uid === uid) saveCurrentUserToStorage(user);
    return { success: true, balance: user.balance };
}

export async function purchaseLesson(uid, lessonId) {
    const shopLesson = window.shopModule && window.shopModule.getLessonById && window.shopModule.getLessonById(lessonId);
    if (!shopLesson) return { success: false, error: 'Урок не найден в магазине' };

    if (useApi()) {
        try {
            const data = await apiFetch(`/api/users/${uid}/purchase`, {
                method: 'POST',
                body: JSON.stringify({ lessonId, price: shopLesson.price })
            });
            const user = getCurrentUserFromStorage();
            if (user && user.uid === uid) {
                user.balance = data.balance;
                user.purchasedLessons = user.purchasedLessons || [];
                if (!user.purchasedLessons.includes(lessonId)) user.purchasedLessons.push(lessonId);
                saveCurrentUserToStorage(user);
                notifyAuthStateListeners(user);
            }
            return { success: true, balance: data.balance };
        } catch (err) {
            return { success: false, error: (err.data && err.data.error) || err.message };
        }
    }

    const users = getAllUsersStorage();
    const user = users[uid];
    if (!user) return { success: false, error: 'User not found' };
    if (!user.balance) user.balance = 0;
    if (!user.purchasedLessons) user.purchasedLessons = [];
    if (user.purchasedLessons.includes(lessonId)) return { success: false, error: 'Урок уже куплен' };
    if (user.balance < shopLesson.price) return { success: false, error: 'Недостаточно монет' };
    user.balance -= shopLesson.price;
    user.purchasedLessons.push(lessonId);
    users[uid] = user;
    if (!saveAllUsersStorage(users)) return { success: false, error: 'Ошибка сохранения данных' };
    const current = getCurrentUserFromStorage();
    if (current && current.uid === uid) saveCurrentUserToStorage(user);
    return { success: true, balance: user.balance };
}

export function getUserBalance(uid) {
    const user = getCurrentUserFromStorage();
    if (user && user.uid === uid) return user.balance ?? 0;
    if (!useApi()) {
        const users = getAllUsersStorage();
        const u = users[uid];
        return u ? (u.balance || 0) : 0;
    }
    return 0;
}

export function isLessonPurchased(uid, lessonId) {
    const user = getCurrentUserFromStorage();
    if (user && user.uid === uid && user.purchasedLessons) return user.purchasedLessons.includes(lessonId);
    if (!useApi()) {
        const users = getAllUsersStorage();
        const u = users[uid];
        return u && u.purchasedLessons ? u.purchasedLessons.includes(lessonId) : false;
    }
    return false;
}

// Глобальный экспорт для main.js
window.authModule = {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    getUserProfile,
    updateUserProfile,
    updateProfileAvatar,
    AVAILABLE_AVATARS,
    AVATAR_UNLOCK_LEVELS,
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

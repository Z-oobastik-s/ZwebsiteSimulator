/**
 * Authentication Module
 * Handles user registration, login, and profile management
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInAnonymously, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Simple password hashing (для безопасности лучше использовать bcrypt на backend, но для фронтенда используем простой хеш)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Available profile avatars (6 заготовок)
export const AVAILABLE_AVATARS = [
    'assets/images/profile photo/profile_1.png',
    'assets/images/profile photo/profile_2.jpg',
    'assets/images/profile photo/profile_3.jpg',
    'assets/images/profile photo/profile_4.jpg',
    'assets/images/profile photo/profile_5.jpg',
    'assets/images/profile photo/profile_6.jpg'
];

// Get user's IP and country (using free API)
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

// Register new user (только логин и пароль, email не обязателен)
export async function registerUser(username, password, email = '') {
    try {
        // Validate input
        if (!username || !password) {
            return { success: false, error: 'Логин и пароль обязательны' };
        }
        
        if (username.length < 3) {
            return { success: false, error: 'Логин должен быть не менее 3 символов' };
        }
        
        if (password.length < 6) {
            return { success: false, error: 'Пароль должен быть не менее 6 символов' };
        }
        
        const userInfo = await getUserInfo();
        
        // Hash password
        const hashedPassword = await hashPassword(password);
        
        // Create anonymous Firebase auth user FIRST (needed for Firestore access)
        const userCredential = await signInAnonymously(auth);
        const user = userCredential.user;
        
        // Check if username already exists (after auth, so we have permissions)
        const usersRef = collection(db, 'users');
        const usernameQuery = query(usersRef, where('username', '==', username));
        const usernameSnapshot = await getDocs(usernameQuery);
        
        if (!usernameSnapshot.empty) {
            // Username taken, sign out and return error
            await signOut(auth);
            return { success: false, error: 'Этот логин уже занят' };
        }
        
        // Update display name
        await updateProfile(user, { displayName: username });
        
        // Create user document in Firestore
        const userDoc = {
            uid: user.uid,
            username: username,
            displayName: username,
            passwordHash: hashedPassword, // Храним хеш пароля
            email: email || '', // Email опциональный
            photoURL: AVAILABLE_AVATARS[0],
            avatarIndex: 0,
            bio: '',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            ip: userInfo.ip,
            country: userInfo.country,
            city: userInfo.city,
            isAdmin: false,
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
        
        // Create user document with UID as document ID
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, userDoc);
        
        return { success: true, user: user };
    } catch (error) {
        let errorMessage = error.message;
        
        if (error.code === 'auth/configuration-not-found') {
            errorMessage = 'Firebase Authentication не настроен. Включите Anonymous Auth в Firebase Console → Authentication → Sign-in method';
        } else if (error.code === 'permission-denied') {
            errorMessage = 'Нет доступа к базе данных. Проверьте Firestore Security Rules';
        }
        
        return { success: false, error: errorMessage };
    }
}

// Login user (только логин и пароль)
export async function loginUser(username, password) {
    try {
        if (!username || !password) {
            return { success: false, error: 'Введите логин и пароль' };
        }
        
        // Sign in anonymously first to get Firestore access
        if (auth.currentUser) {
            await signOut(auth);
        }
        
        const tempCredential = await signInAnonymously(auth);
        const tempUser = tempCredential.user;
        
        // Find user by username (now we have auth)
        const usersRef = collection(db, 'users');
        const usernameQuery = query(usersRef, where('username', '==', username));
        const usernameSnapshot = await getDocs(usernameQuery);
        
        if (usernameSnapshot.empty) {
            await signOut(auth);
            return { success: false, error: 'Неверный логин или пароль' };
        }
        
        // Get user document
        const userDoc = usernameSnapshot.docs[0];
        const userData = userDoc.data();
        
        // Verify password
        const hashedPassword = await hashPassword(password);
        if (userData.passwordHash !== hashedPassword) {
            await signOut(auth);
            return { success: false, error: 'Неверный логин или пароль' };
        }
        
        const userInfo = await getUserInfo();
        
        // Get document ID (could be old UID or current UID)
        const docId = userDoc.id;
        const existingUid = userData.uid;
        
        // If UID changed, we need to move document to new UID
        if (existingUid && existingUid !== tempUser.uid) {
            // Create new document with new UID
            const newUserDoc = {
                ...userData,
                uid: tempUser.uid,
                lastLogin: serverTimestamp(),
                ip: userInfo.ip,
                country: userInfo.country,
                city: userInfo.city
            };
            await setDoc(doc(db, 'users', tempUser.uid), newUserDoc);
            // Optionally delete old document (or keep for history)
            // await deleteDoc(doc(db, 'users', docId));
        } else {
            // Update existing document
            await updateDoc(doc(db, 'users', docId), {
                uid: tempUser.uid,
                lastLogin: serverTimestamp(),
                ip: userInfo.ip,
                country: userInfo.country,
                city: userInfo.city
            });
        }
        
        // Update display name
        await updateProfile(tempUser, { displayName: userData.username });
        
        return { success: true, user: tempUser };
    } catch (error) {
        let errorMessage = error.message;
        
        if (error.code === 'auth/configuration-not-found') {
            errorMessage = 'Firebase Authentication не настроен. Включите Anonymous Auth в Firebase Console → Authentication → Sign-in method';
        } else if (error.code === 'permission-denied') {
            errorMessage = 'Нет доступа к базе данных. Проверьте Firestore Security Rules';
        }
        
        return { success: false, error: errorMessage };
    }
}

// Logout user
export async function logoutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get current user
export function getCurrentUser() {
    return auth.currentUser;
}

// Get user profile from Firestore
export async function getUserProfile(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return { success: true, data: userDoc.data() };
        }
        return { success: false, error: 'User not found' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update user profile
export async function updateUserProfile(uid, updates) {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, updates);
        
        // Also update auth profile if photoURL changed
        if (updates.photoURL && auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: updates.photoURL });
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update profile avatar (выбор из заготовок)
export async function updateProfileAvatar(uid, avatarIndex) {
    try {
        // Validate avatar index
        if (avatarIndex < 0 || avatarIndex >= AVAILABLE_AVATARS.length) {
            return { success: false, error: 'Неверный индекс аватара' };
        }
        
        const avatarURL = AVAILABLE_AVATARS[avatarIndex];
        
        // Update user profile (updateUserProfile уже обновляет auth profile)
        const result = await updateUserProfile(uid, { photoURL: avatarURL, avatarIndex: avatarIndex });
        
        if (result.success) {
            return { success: true, photoURL: avatarURL };
        }
        
        return result;
    } catch (error) {
        console.error('Avatar update error:', error);
        return { success: false, error: error.message || 'Ошибка обновления аватара' };
    }
}

// Session queue for batch updates
let sessionQueue = [];
let sessionUpdateTimeout = null;

// Debounced session update - собирает сессии и обновляет батчами
function debouncedSessionUpdate(uid) {
    if (sessionUpdateTimeout) {
        clearTimeout(sessionUpdateTimeout);
    }
    
    sessionUpdateTimeout = setTimeout(async () => {
        if (sessionQueue.length === 0) return;
        
        const sessionsToProcess = [...sessionQueue];
        sessionQueue = [];
        
        try {
            const userRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) return;
            
            const currentStats = userDoc.data().stats || {};
            const sessions = currentStats.sessions || [];
            
            // Add all queued sessions
            sessionsToProcess.forEach(sessionData => {
                sessions.push({
                    ...sessionData,
                    timestamp: serverTimestamp()
                });
            });
            
            // Update stats
            const totalSessions = sessions.length;
            const totalTime = sessionsToProcess.reduce((sum, s) => sum + (s.time || 0), currentStats.totalTime || 0);
            const bestSpeed = Math.max(
                currentStats.bestSpeed || 0,
                ...sessionsToProcess.map(s => s.speed || 0)
            );
            const totalErrors = sessionsToProcess.reduce((sum, s) => sum + (s.errors || 0), currentStats.totalErrors || 0);
            
            // Calculate average accuracy
            const totalAccuracy = sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0);
            const averageAccuracy = totalSessions > 0 ? Math.round(totalAccuracy / totalSessions) : 0;
            
            // Count completed lessons
            const completedLessons = new Set(
                sessions
                    .filter(s => s.lessonKey)
                    .map(s => s.lessonKey)
            ).size;
            
            await updateDoc(userRef, {
                stats: {
                    totalSessions,
                    totalTime,
                    bestSpeed,
                    averageAccuracy,
                    completedLessons,
                    totalErrors,
                    sessions: sessions.slice(-100) // Keep last 100 sessions
                }
            });
        } catch (error) {
            console.error('Failed to update user session:', error);
        }
    }, 2000); // Обновляем каждые 2 секунды или при накоплении сессий
}

// Add session to user stats - ОПТИМИЗИРОВАНА с debounce
export async function addUserSession(uid, sessionData) {
    // Добавляем в очередь вместо немедленного обновления
    sessionQueue.push(sessionData);
    debouncedSessionUpdate(uid);
    
    // Возвращаем успех сразу, не ждём обновления
    return { success: true };
}

// Check if user is admin
export async function isAdmin(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return userDoc.data().isAdmin === true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

// Get all users (admin only)
export async function getAllUsers() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = [];
        usersSnapshot.forEach((doc) => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return { success: true, users: users };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Delete user (admin only)
export async function deleteUser(uid) {
    try {
        await deleteDoc(doc(db, 'users', uid));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Auth state observer
export function onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
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
    onAuthStateChange
};


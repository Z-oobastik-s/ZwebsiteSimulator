/**
 * Authentication Module
 * Handles user registration, login, and profile management
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

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

// Register new user
export async function registerUser(email, password, username) {
    try {
        const userInfo = await getUserInfo();
        
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update display name
        await updateProfile(user, { displayName: username });
        
        // Create user document in Firestore
        const userDoc = {
            uid: user.uid,
            email: email,
            username: username,
            displayName: username,
            photoURL: '',
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
        
        await setDoc(doc(db, 'users', user.uid), userDoc);
        
        return { success: true, user: user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Login user
export async function loginUser(email, password) {
    try {
        const userInfo = await getUserInfo();
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update last login info
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            lastLogin: serverTimestamp(),
            ip: userInfo.ip,
            country: userInfo.country,
            city: userInfo.city
        });
        
        return { success: true, user: user };
    } catch (error) {
        return { success: false, error: error.message };
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
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Upload profile photo
export async function uploadProfilePhoto(uid, file) {
    try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            return { success: false, error: 'Файл должен быть изображением' };
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return { success: false, error: 'Размер файла не должен превышать 5MB' };
        }
        
        const storageRef = ref(storage, `profile-photos/${uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        // Update user profile
        await updateUserProfile(uid, { photoURL: downloadURL });
        
        // Update auth profile
        const user = auth.currentUser;
        if (user) {
            await updateProfile(user, { photoURL: downloadURL });
        }
        
        return { success: true, photoURL: downloadURL };
    } catch (error) {
        console.error('Photo upload error:', error);
        return { success: false, error: error.message || 'Ошибка загрузки фото' };
    }
}

// Add session to user stats
export async function addUserSession(uid, sessionData) {
    try {
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) return { success: false, error: 'User not found' };
        
        const currentStats = userDoc.data().stats || {};
        const sessions = currentStats.sessions || [];
        
        // Add new session
        sessions.push({
            ...sessionData,
            timestamp: serverTimestamp()
        });
        
        // Update stats
        const totalSessions = sessions.length;
        const totalTime = (currentStats.totalTime || 0) + (sessionData.time || 0);
        const bestSpeed = Math.max(currentStats.bestSpeed || 0, sessionData.speed || 0);
        const totalErrors = (currentStats.totalErrors || 0) + (sessionData.errors || 0);
        
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
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
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
    uploadProfilePhoto,
    addUserSession,
    isAdmin,
    getAllUsers,
    deleteUser,
    onAuthStateChange
};


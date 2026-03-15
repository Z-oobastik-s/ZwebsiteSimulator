/**
 * Статистика посещений и онлайн-пользователей через Firebase Realtime Database.
 * Пути: siteStats/visits (счётчик), online/{visitorId} (присутствие с onDisconnect).
 */

import { initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, onValue, onDisconnect, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const VISITS_KEY = 'zoob_visit_counted';
const VISITOR_ID_KEY = 'zoob_visitor_id';

function getOrCreateVisitorId() {
    try {
        var id = sessionStorage.getItem(VISITOR_ID_KEY);
        if (id) return id;
        id = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        sessionStorage.setItem(VISITOR_ID_KEY, id);
        return id;
    } catch (e) {
        return 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    }
}

function pluralPlayers(n, lang) {
    var num = typeof n === 'number' && n >= 0 ? n : 0;
    lang = lang || (typeof window.app !== 'undefined' && window.app.lang) || 'ru';
    if (lang === 'en') {
        return num === 1 ? '1 player' : num + ' players';
    }
    if (lang === 'uk') {
        var d = num % 10, h = num % 100;
        if (d === 1 && h !== 11) return num + ' гравець';
        if (d >= 2 && d <= 4 && (h < 10 || h >= 20)) return num + ' гравці';
        return num + ' гравців';
    }
    var d = num % 10, h = num % 100;
    if (d === 1 && h !== 11) return num + ' игрок';
    if (d >= 2 && d <= 4 && (h < 10 || h >= 20)) return num + ' игрока';
    return num + ' игроков';
}

function updateUI(visits, onlineCount) {
    var visitsEl = document.getElementById('siteStatsVisits');
    var onlineEl = document.getElementById('siteStatsOnline');
    var lang = (typeof window.app !== 'undefined' && window.app.lang) || 'ru';
    var locale = lang === 'en' ? 'en-US' : lang === 'uk' ? 'uk-UA' : 'ru-RU';
    if (visitsEl && typeof visits === 'number') visitsEl.textContent = visits.toLocaleString(locale);
    if (onlineEl) onlineEl.textContent = pluralPlayers(typeof onlineCount === 'number' ? onlineCount : 0, lang);
}

var app;
try {
    app = getApp();
} catch (e) {
    app = initializeApp(firebaseConfig);
}
var database = getDatabase(app);

var visitsRef = ref(database, 'siteStats/visits');
var onlineRef = ref(database, 'online');

// Один раз за сессию увеличиваем счётчик посещений
function recordVisit() {
    try {
        if (sessionStorage.getItem(VISITS_KEY)) return;
        sessionStorage.setItem(VISITS_KEY, '1');
        runTransaction(visitsRef, function (current) {
            return (current || 0) + 1;
        }).catch(function () {});
    } catch (e) {}
}

// Регистрируем присутствие и удаление при уходе
function registerPresence() {
    var visitorId = getOrCreateVisitorId();
    var myRef = ref(database, 'online/' + visitorId);
    set(myRef, { lastSeen: serverTimestamp() }).then(function () {
        onDisconnect(myRef).remove().catch(function () {});
    }).catch(function () {});
}

// Подписка на число посещений и список онлайн
onValue(visitsRef, function (snapshot) {
    var val = snapshot.val();
    window.__siteStatsVisits = typeof val === 'number' ? val : 0;
    updateUI(window.__siteStatsVisits, window.__siteStatsOnline);
}, { onlyOnce: false });

onValue(onlineRef, function (snapshot) {
    var val = snapshot.val();
    var count = val ? Object.keys(val).length : 0;
    window.__siteStatsOnline = count;
    updateUI(window.__siteStatsVisits, count);
}, { onlyOnce: false });

recordVisit();
registerPresence();

if (typeof window !== 'undefined') window.__siteStatsUpdateUI = updateUI;
export { pluralPlayers, updateUI };

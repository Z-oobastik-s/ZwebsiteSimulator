/**
 * Статистика посещений и онлайн-пользователей через Firebase Realtime Database.
 * Пути:
 *   siteStats/visits        — общий счётчик
 *   siteStats/daily/YYYY-MM-DD — дневные посещения
 *   online/{visitorId}      — присутствие: lastSeen, countryCode, flag, device
 */

import { initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, onValue, onDisconnect, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

var VISITS_KEY     = 'zoob_visit_counted';
var VISITOR_ID_KEY = 'zoob_visitor_id';
var GEO_CACHE_KEY  = 'zoob_geo_v1';

// ── Helpers ─────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function getTodayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function getDateKey(daysAgo) {
    var d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

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

function countryCodeToFlag(code) {
    if (!code || code.length !== 2) return '🌍';
    try {
        var c = code.toUpperCase();
        return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65) +
               String.fromCodePoint(0x1F1E6 + c.charCodeAt(1) - 65);
    } catch (e) { return '🌍'; }
}

function getDeviceType() {
    var ua = navigator.userAgent || '';
    if (/Mobile|Android.*Mobile|iPhone|iPod/i.test(ua)) return 'mobile';
    if (/Tablet|iPad|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
    return 'desktop';
}

function deviceIcon(type) {
    if (type === 'mobile') return '📱';
    if (type === 'tablet') return '📟';
    return '💻';
}

function getStatsLang() {
    if (typeof window.app !== 'undefined' && window.app.lang) return window.app.lang;
    var dl = document.documentElement && document.documentElement.getAttribute('data-lang');
    if (dl) return dl;
    var hl = document.documentElement && document.documentElement.getAttribute('lang');
    if (hl === 'en') return 'en';
    if (hl === 'uk') return 'uk';
    return 'ru';
}

function pluralPlayers(n, lang) {
    var num = typeof n === 'number' && n >= 0 ? n : 0;
    lang = lang || getStatsLang();
    if (lang === 'en') return num === 1 ? '1 player' : num + ' players';
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
    var lang = getStatsLang();
    var locale = lang === 'en' ? 'en-US' : lang === 'uk' ? 'uk-UA' : 'ru-RU';
    if (visitsEl && typeof visits === 'number') visitsEl.textContent = visits.toLocaleString(locale);
    if (onlineEl) onlineEl.textContent = pluralPlayers(typeof onlineCount === 'number' ? onlineCount : 0, lang);
}

// ── Geo detection via Cloudflare trace ─────────────────────────────────────

async function fetchGeo() {
    try {
        var cached = sessionStorage.getItem(GEO_CACHE_KEY);
        if (cached) return JSON.parse(cached);
        var res = await fetch('https://www.cloudflare.com/cdn-cgi/trace', { cache: 'no-store' });
        var text = await res.text();
        var m = text.match(/loc=([A-Z]{2})/);
        var code = m ? m[1] : 'XX';
        var data = { code: code, flag: countryCodeToFlag(code) };
        try { sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(data)); } catch (e) {}
        return data;
    } catch (e) {
        return { code: 'XX', flag: '🌍' };
    }
}

// ── Firebase setup ──────────────────────────────────────────────────────────

var fbApp;
try { fbApp = getApp(); } catch (e) { fbApp = initializeApp(firebaseConfig); }
var database = getDatabase(fbApp);

var visitsRef = ref(database, 'siteStats/visits');
var dailyRef  = ref(database, 'siteStats/daily');
var onlineRef = ref(database, 'online');

var _visits     = 0;
var _onlineData = {};
var _dailyData  = {};

onValue(visitsRef, function (snap) {
    _visits = typeof snap.val() === 'number' ? snap.val() : 0;
    window.__siteStatsVisits = _visits;
    updateUI(_visits, Object.keys(_onlineData).length);
    _refreshModal();
});

onValue(dailyRef, function (snap) {
    _dailyData = snap.val() || {};
    window.__siteStatsDailyData = _dailyData;
    _refreshModal();
});

onValue(onlineRef, function (snap) {
    _onlineData = snap.val() || {};
    var count = Object.keys(_onlineData).length;
    window.__siteStatsOnline = count;
    window.__siteStatsOnlineData = _onlineData;
    updateUI(_visits, count);
    _refreshModal();
});

// ── Record visit (once per session) ────────────────────────────────────────

function recordVisit() {
    try {
        if (sessionStorage.getItem(VISITS_KEY)) return;
        sessionStorage.setItem(VISITS_KEY, '1');
        runTransaction(visitsRef, function (c) { return (c || 0) + 1; }).catch(function () {});
        var dayKey = getTodayKey();
        runTransaction(ref(database, 'siteStats/daily/' + dayKey), function (c) { return (c || 0) + 1; }).catch(function () {});
    } catch (e) {}
}

async function registerPresence() {
    var visitorId = getOrCreateVisitorId();
    var myRef = ref(database, 'online/' + visitorId);
    var geo = await fetchGeo();
    set(myRef, {
        lastSeen: serverTimestamp(),
        countryCode: geo.code,
        flag: geo.flag,
        device: getDeviceType()
    }).then(function () {
        onDisconnect(myRef).remove().catch(function () {});
    }).catch(function () {});
}

recordVisit();
registerPresence();

// ── Stats Modal ─────────────────────────────────────────────────────────────

var _modalOpen = false;
var _modalWrap = null;

function _t(key) {
    var lang = getStatsLang();
    var T = {
        title:        { ru: 'Статистика сайта', en: 'Site Statistics', uk: 'Статистика сайту' },
        totalVisits:  { ru: 'Всего посещений', en: 'Total visits', uk: 'Всього відвідувань' },
        byDay:        { ru: 'Посещения по дням', en: 'Visits by day', uk: 'Відвідування по днях' },
        onlineNow:    { ru: 'Онлайн сейчас', en: 'Online now', uk: 'Онлайн зараз' },
        nobody:       { ru: 'Никого нет онлайн', en: 'No one online', uk: 'Нікого немає онлайн' },
        visitor:      { ru: 'посетитель', en: 'visitor', uk: 'відвідувач' },
        today:        { ru: 'Сегодня', en: 'Today', uk: 'Сьогодні' },
        yesterday:    { ru: 'Вчера', en: 'Yesterday', uk: 'Вчора' },
        dayBefore:    { ru: 'Позавчера', en: '2 days ago', uk: 'Позавчора' },
        daysAgo:      { ru: ' дн. назад', en: ' days ago', uk: ' дн. тому' },
        liveUpdates:  { ru: 'Обновляется в реальном времени', en: 'Updates in real time', uk: 'Оновлюється в реальному часі' }
    };
    var entry = T[key];
    if (!entry) return key;
    return entry[lang] || entry['ru'];
}

function _dayLabel(daysAgo) {
    if (daysAgo === 0) return _t('today');
    if (daysAgo === 1) return _t('yesterday');
    if (daysAgo === 2) return _t('dayBefore');
    return daysAgo + _t('daysAgo');
}

function _buildContent() {
    var lang  = getStatsLang();
    var locale = lang === 'en' ? 'en-US' : lang === 'uk' ? 'uk-UA' : 'ru-RU';

    // Collect last 7 days
    var days = [];
    var maxVal = 1;
    for (var i = 0; i < 7; i++) {
        var key = getDateKey(i);
        var val = _dailyData[key] || 0;
        if (val > maxVal) maxVal = val;
        days.push({ label: _dayLabel(i), val: val, isToday: i === 0 });
    }

    var daysHTML = days.map(function (d) {
        var pct = Math.max(Math.round((d.val / maxVal) * 100), d.val > 0 ? 2 : 0);
        var barColor = d.isToday
            ? 'linear-gradient(90deg,#06b6d4,#67e8f9)'
            : 'linear-gradient(90deg,#1e40af,#3b82f6)';
        return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">' +
            '<span style="width:88px;font-size:11px;color:' + (d.isToday ? '#e2e8f0' : '#94a3b8') + ';flex-shrink:0;font-weight:' + (d.isToday ? '600' : '400') + '">' + d.label + '</span>' +
            '<div style="flex:1;background:rgba(255,255,255,0.05);border-radius:4px;height:16px;overflow:hidden">' +
            '<div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:4px;transition:width 0.5s ease"></div>' +
            '</div>' +
            '<span style="width:30px;text-align:right;font-size:11px;color:' + (d.isToday ? '#22d3ee' : '#64748b') + ';font-variant-numeric:tabular-nums">' + d.val + '</span>' +
        '</div>';
    }).join('');

    // Online users
    var users = Object.entries(_onlineData);
    var onlineCount = users.length;
    var onlineHTML = onlineCount === 0
        ? '<p style="color:#475569;font-size:12px;text-align:center;padding:10px 0">' + _t('nobody') + '</p>'
        : users.map(function (entry, i) {
            var id  = entry[0];
            var u   = entry[1] || {};
            var flag   = u.flag || '🌍';
            var device = deviceIcon(u.device || 'desktop');
            var country = u.countryCode && u.countryCode !== 'XX' ? u.countryCode : '';
            var label  = _t('visitor') + ' #' + (i + 1) + (country ? ' · ' + country : '');
            return '<div style="display:flex;align-items:center;gap:10px;padding:7px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;margin-bottom:5px">' +
                '<span style="font-size:20px;line-height:1">' + flag + '</span>' +
                '<span style="font-size:15px;line-height:1">' + device + '</span>' +
                '<span style="font-size:12px;color:#94a3b8;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + label + '</span>' +
                '<span style="width:8px;height:8px;border-radius:50%;background:#34d399;flex-shrink:0;box-shadow:0 0 8px #34d39988"></span>' +
            '</div>';
        }).join('');

    return '<div style="padding:18px 20px 6px">' +
        // Total visits card
        '<div style="display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,rgba(6,182,212,0.12),rgba(6,182,212,0.04));border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:14px 18px;margin-bottom:18px">' +
            '<div>' +
                '<p style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">' + _t('totalVisits') + '</p>' +
                '<p style="font-size:28px;font-weight:700;color:#22d3ee;font-variant-numeric:tabular-nums;margin:0;line-height:1">' + (_visits || 0).toLocaleString(locale) + '</p>' +
            '</div>' +
            '<span style="font-size:36px;opacity:0.4">📈</span>' +
        '</div>' +
        // Daily chart
        '<p style="font-size:11px;color:#475569;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px">' + _t('byDay') + '</p>' +
        daysHTML +
        // Online users
        '<p style="font-size:11px;color:#475569;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:18px 0 10px">' +
            _t('onlineNow') + ' <span style="color:#34d399;font-weight:700">' + onlineCount + '</span>' +
        '</p>' +
        onlineHTML +
        // Live indicator
        '<div style="display:flex;align-items:center;gap:6px;justify-content:center;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)">' +
            '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#34d399;animation:pulse 2s infinite"></span>' +
            '<span style="font-size:10px;color:#334155">' + _t('liveUpdates') + '</span>' +
        '</div>' +
    '</div>';
}

function _attachHandlers() {
    var closeBtn = document.getElementById('_statsClose');
    var overlay  = document.getElementById('_statsOverlay');
    if (closeBtn) closeBtn.addEventListener('click', _closeModal);
    if (overlay)  overlay.addEventListener('click', function (e) {
        if (e.target === overlay) _closeModal();
    });
}

function _openModal() {
    if (_modalWrap) { _modalWrap.remove(); _modalWrap = null; }
    _modalOpen = true;

    _modalWrap = document.createElement('div');
    _modalWrap.id = '_statsModalWrap';
    _modalWrap.innerHTML =
        '<div id="_statsOverlay" style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;animation:_sfade .18s ease">' +
            '<div style="background:linear-gradient(155deg,#0f172a 0%,#1e293b 100%);border:1px solid rgba(6,182,212,0.2);border-radius:18px;width:100%;max-width:420px;max-height:88vh;overflow-y:auto;box-shadow:0 30px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(6,182,212,0.08)">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px 0;position:sticky;top:0;background:#0f172a;z-index:1;border-radius:18px 18px 0 0">' +
                    '<h2 style="font-size:15px;font-weight:700;color:#e2e8f0;margin:0;display:flex;align-items:center;gap:8px"><span>📊</span>' + _t('title') + '</h2>' +
                    '<button id="_statsClose" style="width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background .15s" onmouseover="this.style.background=\'rgba(255,255,255,0.15)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.08)\'">✕</button>' +
                '</div>' +
                '<div id="_statsContent">' + _buildContent() + '</div>' +
            '</div>' +
        '</div>';

    // Inject keyframe for fade-in if not already there
    if (!document.getElementById('_statsStyle')) {
        var st = document.createElement('style');
        st.id = '_statsStyle';
        st.textContent = '@keyframes _sfade{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}';
        document.head.appendChild(st);
    }

    document.body.appendChild(_modalWrap);
    _attachHandlers();
    document.addEventListener('keydown', _onEsc);
}

function _closeModal() {
    if (_modalWrap) { _modalWrap.remove(); _modalWrap = null; }
    _modalOpen = false;
    document.removeEventListener('keydown', _onEsc);
}

function _onEsc(e) { if (e.key === 'Escape') _closeModal(); }

function _refreshModal() {
    if (!_modalOpen || !_modalWrap) return;
    var content = document.getElementById('_statsContent');
    if (content) content.innerHTML = _buildContent();
}

// ── Init click on stats bar ─────────────────────────────────────────────────

function _initBar() {
    var bar = document.getElementById('siteStatsBar');
    if (!bar) return;
    bar.addEventListener('click', function () {
        if (_modalOpen) _closeModal(); else _openModal();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initBar);
} else {
    _initBar();
}

if (typeof window !== 'undefined') window.__siteStatsUpdateUI = updateUI;
export { pluralPlayers, updateUI };


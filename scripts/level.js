/**
 * Player level and XP system — игровая прокачка
 */

const PLAYER_XP_KEY = 'zoobastiks_player_xp';

// XP required (total from 0) to reach each level. Level 1 = 0, level 2 = 100, ...
function getXPThreshold(level) {
    if (level <= 1) return 0;
    var xp = 0;
    for (var i = 1; i < level; i++) {
        xp += 80 + Math.floor(i * 22);
    }
    return xp;
}

function getLevelInfo(totalXP) {
    var xp = Math.max(0, Math.floor(totalXP));
    var level = 1;
    while (getXPThreshold(level + 1) <= xp) level++;
    var xpForCurrent = getXPThreshold(level);
    var xpForNext = getXPThreshold(level + 1);
    var xpInLevel = xp - xpForCurrent;
    var xpToNext = xpForNext - xpForCurrent;
    var tierName = getTierName(level);
    return {
        level: level,
        tierName: tierName,
        totalXP: xp,
        xpInLevel: xpInLevel,
        xpToNext: xpToNext,
        progressPct: xpToNext > 0 ? Math.round((xpInLevel / xpToNext) * 100) : 100
    };
}

var TIER_NAMES_RU = ['Новичок', 'Ученик', 'Практик', 'Знаток', 'Мастер', 'Эксперт', 'Виртуоз', 'Легенда', 'Титан', 'Бог клавиатуры'];
var TIER_NAMES_EN = ['Rookie', 'Apprentice', 'Practitioner', 'Expert', 'Master', 'Virtuoso', 'Legend', 'Titan', 'Champion', 'Keyboard God'];

function getTierName(level) {
    var tierIndex = Math.min(Math.floor((level - 1) / 5), TIER_NAMES_RU.length - 1);
    var lang = (typeof app !== 'undefined' && app.lang === 'en') ? 'en' : 'ru';
    var names = lang === 'en' ? TIER_NAMES_EN : TIER_NAMES_RU;
    return names[Math.min(tierIndex, names.length - 1)] || names[names.length - 1];
}

function getPlayerXP() {
    try {
        var stored = localStorage.getItem(PLAYER_XP_KEY);
        if (stored !== null) return Math.max(0, parseInt(stored, 10));
    } catch (e) {}
    return 0;
}

function setPlayerXP(totalXP) {
    try {
        localStorage.setItem(PLAYER_XP_KEY, String(Math.max(0, Math.floor(totalXP))));
    } catch (e) {}
}

function addPlayerXP(amount) {
    var current = getPlayerXP();
    var beforeLevel = getLevelInfo(current).level;
    var newTotal = current + Math.max(0, Math.floor(amount));
    setPlayerXP(newTotal);
    var after = getLevelInfo(newTotal);
    var leveledUp = after.level > beforeLevel;
    return { totalXP: newTotal, leveledUp: leveledUp, newLevel: after.level, info: after };
}

/**
 * Начисление XP за сессию: режим + точность + скорость
 */
function calculateSessionXP(sessionData) {
    var base = 10;
    if (sessionData.mode === 'lesson') base += 15;
    else if (sessionData.mode === 'speedtest') base += 20;
    else if (sessionData.mode === 'free') base += 8;
    else base += 5;
    var acc = sessionData.accuracy || 0;
    var speed = sessionData.speed || 0;
    var accuracyBonus = Math.floor(acc / 5);
    var speedBonus = Math.min(25, Math.floor(speed / 15));
    return base + accuracyBonus + speedBonus;
}

window.levelModule = {
    getLevelInfo: getLevelInfo,
    getPlayerXP: getPlayerXP,
    addPlayerXP: addPlayerXP,
    calculateSessionXP: calculateSessionXP,
    getTierName: getTierName
};

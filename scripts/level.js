/**
 * Player level and XP system - игровая прокачка
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

// Уникальное название ранга для каждого уровня (1–50), без повторений
var TIER_NAMES_RU = [
    'Новичок', 'Юный печатник', 'Начинающий', 'Первые шаги', 'Уверенный старт',
    'Ученик', 'Грамотей', 'Успевающий', 'Старательный', 'Отличник',
    'Практик', 'Настойчивый', 'Трудяга', 'Опытный', 'Быстрые пальцы',
    'Знаток', 'Грамотей-про', 'Следопыт', 'Точный удар', 'Скоростник',
    'Мастер', 'Виртуоз клавиш', 'Меткий', 'Неудержимый', 'Чемпион ряда',
    'Эксперт', 'Ас набора', 'Молния', 'Безошибочный', 'Эталон',
    'Виртуоз', 'Снайпер букв', 'Турбо-печатник', 'Живые пальцы', 'Гроссмейстер',
    'Легенда', 'Титан клавиатуры', 'Небожитель', 'Метр набора', 'Абсолют',
    'Титан', 'Повелитель клавиш', 'Король скорости', 'Идеал', 'Великий',
    'Бог клавиатуры', 'Создатель текста', 'Маг клавиш', 'Звезда набора', 'Вершина'
];
var TIER_NAMES_EN = [
    'Rookie', 'Young Typer', 'Beginner', 'First Steps', 'Confident Start',
    'Apprentice', 'Literate', 'Ace Student', 'Diligent', 'Honor Roll',
    'Practitioner', 'Persistent', 'Hard Worker', 'Experienced', 'Quick Fingers',
    'Expert', 'Pro Literate', 'Trailblazer', 'Precise Strike', 'Speedster',
    'Master', 'Key Virtuoso', 'Sharp', 'Unstoppable', 'Row Champion',
    'Ace', 'Typing Ace', 'Lightning', 'Flawless', 'Benchmark',
    'Virtuoso', 'Letter Sniper', 'Turbo Typer', 'Live Fingers', 'Grandmaster',
    'Legend', 'Keyboard Titan', 'Immortal', 'Typing Master', 'Absolute',
    'Titan', 'Key Lord', 'Speed King', 'Ideal', 'The Great',
    'Keyboard God', 'Text Creator', 'Key Mage', 'Typing Star', 'The Peak'
];
var TIER_NAMES_UA = [
    'Новачок', 'Юний друкар', 'Початківець', 'Перші кроки', 'Впевнений старт',
    'Учень', 'Грамотій', 'Успішний', 'Старанний', 'Відмінник',
    'Практик', 'Наполегливий', 'Трудар', 'Досвідчений', 'Швидкі пальці',
    'Знавець', 'Грамотій-про', 'Слідопит', 'Точний удар', 'Швидкісник',
    'Майстер', 'Віртуоз клавіш', 'Влучний', 'Незупинний', 'Чемпіон ряду',
    'Експерт', 'Ас набору', 'Блискавка', 'Безпомилковий', 'Еталон',
    'Віртуоз', 'Снайпер літер', 'Турбо-друкар', 'Живі пальці', 'Гросмейстер',
    'Легенда', 'Титан клавіатури', 'Безсмертний', 'Метр набору', 'Абсолют',
    'Титан', 'Володар клавіш', 'Король швидкості', 'Ідеал', 'Великий',
    'Бог клавіатури', 'Творець тексту', 'Маг клавіш', 'Зірка набору', 'Вершина'
];

function getTierNameForLang(level, lang) {
    var index = Math.max(0, Math.min(level - 1, TIER_NAMES_RU.length - 1));
    if (lang === 'en') return TIER_NAMES_EN[index] || TIER_NAMES_EN[TIER_NAMES_EN.length - 1];
    if (lang === 'ua') return TIER_NAMES_UA[index] || TIER_NAMES_UA[TIER_NAMES_UA.length - 1];
    return TIER_NAMES_RU[index] || TIER_NAMES_RU[TIER_NAMES_RU.length - 1];
}

function getTierName(level) {
    var l = (typeof app !== 'undefined' && app.lang === 'en') ? 'en' : (typeof app !== 'undefined' && app.lang === 'ua') ? 'ua' : 'ru';
    return getTierNameForLang(level, l);
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
    else if (sessionData.mode === 'replay-errors') base += 10; // короткий дриль после сессии
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
    getTierName: getTierName,
    getTierNameForLang: getTierNameForLang,
    getXPThreshold: getXPThreshold
};


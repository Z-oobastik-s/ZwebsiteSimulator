/**
 * Коллекционные карты: assets/images/card/card_1.png … card_52.png
 * Бустер за монеты, бонус к награде за уроки по числу уникальных карт.
 */
(function (global) {
    'use strict';

    var TOTAL = 52;
    var BOOSTER_COST = 95;
    var DUPLICATE_REFUND = 30;
    /** Макс. бонус к монетам за урок (точность ≥90%), % */
    var MAX_COLLECTION_BONUS_PCT = 15;

    function cardPath(id) {
        return 'assets/images/card/card_' + id + '.png';
    }

    function weightForNum(n) {
        if (n <= 26) return 12;
        if (n <= 39) return 10;
        if (n <= 49) return 6;
        return 3;
    }

    /** Случайная карта 1..52 с весами редкости (как на сервере). */
    function pickRandomCardIdForPull() {
        var totalW = 0;
        var i;
        for (i = 1; i <= TOTAL; i++) totalW += weightForNum(i);
        var r = Math.random() * totalW;
        for (i = 1; i <= TOTAL; i++) {
            r -= weightForNum(i);
            if (r <= 0) return String(i);
        }
        return String(TOTAL);
    }

    function getRarityKey(id) {
        var n = parseInt(id, 10);
        if (!n || n < 1) return 'common';
        if (n <= 26) return 'common';
        if (n <= 39) return 'uncommon';
        if (n <= 49) return 'rare';
        return 'mythic';
    }

    function normalizeOwned(raw) {
        if (!raw || !Array.isArray(raw)) return [];
        var out = [];
        var seen = Object.create(null);
        raw.forEach(function (x) {
            var id = String(x).replace(/\D/g, '');
            if (!id) return;
            var n = parseInt(id, 10);
            if (n < 1 || n > TOTAL) return;
            id = String(n);
            if (seen[id]) return;
            seen[id] = 1;
            out.push(id);
        });
        return out;
    }

    /** Процент бонуса к монетам за урок (целое 0..MAX). */
    function getCollectionBonusPercent(ownedCount) {
        var n = Math.max(0, Math.min(TOTAL, parseInt(ownedCount, 10) || 0));
        return Math.min(MAX_COLLECTION_BONUS_PCT, Math.floor((n * MAX_COLLECTION_BONUS_PCT) / TOTAL));
    }

    function getLessonCoinMultiplier() {
        var user = global.authModule && typeof global.authModule.getCurrentUser === 'function'
            ? global.authModule.getCurrentUser()
            : null;
        var owned = normalizeOwned(user && user.collectedCards).length;
        var pct = getCollectionBonusPercent(owned);
        return 1 + pct / 100;
    }

    function getAllCardIds() {
        var a = [];
        for (var i = 1; i <= TOTAL; i++) a.push(String(i));
        return a;
    }

    global.collectibleCardsModule = {
        TOTAL: TOTAL,
        BOOSTER_COST: BOOSTER_COST,
        DUPLICATE_REFUND: DUPLICATE_REFUND,
        MAX_COLLECTION_BONUS_PCT: MAX_COLLECTION_BONUS_PCT,
        cardPath: cardPath,
        pickRandomCardIdForPull: pickRandomCardIdForPull,
        getRarityKey: getRarityKey,
        normalizeOwned: normalizeOwned,
        getCollectionBonusPercent: getCollectionBonusPercent,
        getLessonCoinMultiplier: getLessonCoinMultiplier,
        getAllCardIds: getAllCardIds
    };
})(typeof window !== 'undefined' ? window : this);


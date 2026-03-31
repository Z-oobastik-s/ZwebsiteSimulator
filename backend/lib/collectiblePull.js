/**
 * Серверный выбор карты для бустера (веса совпадают с scripts/collectible-cards.js).
 */
const TOTAL = 52;
const BOOSTER_COST = 95;
const DUPLICATE_REFUND = 30;

function weightForNum(n) {
    if (n <= 26) return 12;
    if (n <= 39) return 10;
    if (n <= 49) return 6;
    return 3;
}

function pickRandomCardId() {
    let totalW = 0;
    for (let i = 1; i <= TOTAL; i++) totalW += weightForNum(i);
    let r = Math.random() * totalW;
    for (let i = 1; i <= TOTAL; i++) {
        r -= weightForNum(i);
        if (r <= 0) return String(i);
    }
    return String(TOTAL);
}

module.exports = { TOTAL, BOOSTER_COST, DUPLICATE_REFUND, pickRandomCardId, weightForNum };

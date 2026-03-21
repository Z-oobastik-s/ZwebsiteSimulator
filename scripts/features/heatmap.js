/**
 * Keyboard Heatmap Module
 * Overlays error frequency colours on the virtual keyboard using CSS custom properties.
 * Red intensity = more errors on that key.
 */

(function () {
    /**
     * Рендерит тепловую карту на контейнере клавиатуры.
     * @param {HTMLElement|string} container  — элемент или id контейнера клавиатуры
     * @param {Object} errorMap               — { 'а': 12, 'в': 3, ... }
     */
    function renderHeatmap(container, errorMap) {
        var el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el || !errorMap) return;

        var keys = el.querySelectorAll('[data-key]');
        if (!keys.length) return;

        // Находим максимальное значение для нормировки
        var values = Object.values(errorMap).map(Number).filter(function (v) { return v > 0; });
        if (!values.length) {
            // Сбрасываем все цвета
            keys.forEach(function (btn) { btn.style.removeProperty('--heat'); });
            return;
        }
        var maxErr = Math.max.apply(null, values);

        keys.forEach(function (btn) {
            var key = btn.getAttribute('data-key');
            // Проверяем оба варианта: символ в нижнем регистре и пробел
            var count = (errorMap[key] || errorMap[key && key.toLowerCase()] || 0);
            if (key === 'space') count = errorMap[' '] || 0;
            var intensity = maxErr > 0 ? Math.min(1, count / maxErr) : 0;
            // --heat: 0 = нет ошибок, 1 = максимум
            btn.style.setProperty('--heat', intensity.toFixed(3));
        });
    }

    /** Загружает карту ошибок из localStorage + текущего сеанса (_keyErrorsCache). */
    function getErrorMap() {
        var base = {};
        try {
            var stored = localStorage.getItem('zoob_key_errors');
            if (stored) base = JSON.parse(stored);
        } catch (_e) {}
        // Добавляем текущую сессию из in-memory кэша (если есть)
        if (typeof _keyErrorsCache !== 'undefined') {
            for (var k in _keyErrorsCache) {
                base[k] = (base[k] || 0) + _keyErrorsCache[k];
            }
        }
        return base;
    }

    /** Очищает тепловую карту с контейнера. */
    function clearHeatmap(container) {
        var el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el) return;
        el.querySelectorAll('[data-key]').forEach(function (btn) {
            btn.style.removeProperty('--heat');
        });
    }

    /**
     * Возвращает топ-N самых проблемных клавиш из errorMap.
     * @param {Object} errorMap
     * @param {number} n
     * @returns {Array<{key:string, count:number}>}
     */
    function getTopErrors(errorMap, n) {
        n = n || 5;
        return Object.keys(errorMap)
            .filter(function (k) { return errorMap[k] > 0; })
            .map(function (k) { return { key: k, count: errorMap[k] }; })
            .sort(function (a, b) { return b.count - a.count; })
            .slice(0, n);
    }

    window.heatmapModule = {
        renderHeatmap: renderHeatmap,
        clearHeatmap: clearHeatmap,
        getErrorMap: getErrorMap,
        getTopErrors: getTopErrors
    };
})();


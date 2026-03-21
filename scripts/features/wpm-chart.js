/**
 * WPM/CPM Chart Module
 * Records speed history during practice and renders a Canvas line chart in results modal.
 */

(function () {
    // Интервал записи точек (мс)
    var RECORD_INTERVAL_MS = 2000;
    var _recordTimer = null;

    /** Запускает запись точек скорости. Вызывать из startPractice(). */
    function startRecording() {
        stopRecording();
        if (typeof app === 'undefined') return;
        app.speedHistory = [];
        _recordTimer = setInterval(function () {
            if (!app || app.isPaused) return;
            var elapsed = Math.max(0.001, (Date.now() - app.startTime - (app.totalLessonPauseDuration || 0)) / 1000);
            var minutes = elapsed / 60;
            var cpm = minutes > 0 ? Math.round(app.currentPosition / minutes) : 0;
            app.speedHistory.push({ t: Math.round(elapsed), cpm: cpm });
        }, RECORD_INTERVAL_MS);
    }

    /** Останавливает запись. Вызывать из finishPractice() и exitPractice(). */
    function stopRecording() {
        if (_recordTimer) {
            clearInterval(_recordTimer);
            _recordTimer = null;
        }
    }

    /**
     * Рисует line chart на canvas.
     * @param {HTMLCanvasElement} canvas
     * @param {Array<{t:number, cpm:number}>} history
     */
    function renderChart(canvas, history) {
        if (!canvas || !history || history.length < 2) {
            if (canvas) {
                var ctx0 = canvas.getContext('2d');
                ctx0.clearRect(0, 0, canvas.width, canvas.height);
                ctx0.fillStyle = 'rgba(99,102,241,0.12)';
                ctx0.fillRect(0, 0, canvas.width, canvas.height);
                ctx0.fillStyle = 'rgba(148,163,184,0.5)';
                ctx0.font = '13px monospace';
                ctx0.textAlign = 'center';
                ctx0.fillText('Недостаточно данных', canvas.width / 2, canvas.height / 2);
            }
            return;
        }

        var dpr = window.devicePixelRatio || 1;
        var W = canvas.offsetWidth || canvas.width;
        var H = canvas.offsetHeight || canvas.height;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        var padL = 40, padR = 12, padT = 12, padB = 28;
        var cw = W - padL - padR;
        var ch = H - padT - padB;

        // Диапазоны
        var maxCpm = Math.max.apply(null, history.map(function (p) { return p.cpm; }));
        var maxT = history[history.length - 1].t || 1;
        maxCpm = Math.max(maxCpm, 60);

        // Фон
        var grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
        grad.addColorStop(0, 'rgba(99,102,241,0.15)');
        grad.addColorStop(1, 'rgba(99,102,241,0.02)');
        ctx.fillStyle = grad;
        ctx.fillRect(padL, padT, cw, ch);

        // Сетка (горизонтальные линии)
        ctx.strokeStyle = 'rgba(148,163,184,0.15)';
        ctx.lineWidth = 1;
        var gridLines = 4;
        for (var g = 0; g <= gridLines; g++) {
            var gy = padT + ch - (g / gridLines) * ch;
            ctx.beginPath();
            ctx.moveTo(padL, gy);
            ctx.lineTo(padL + cw, gy);
            ctx.stroke();
            // Метка Y
            ctx.fillStyle = 'rgba(148,163,184,0.7)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(Math.round((g / gridLines) * maxCpm), padL - 4, gy + 4);
        }

        // Метки X (время)
        ctx.fillStyle = 'rgba(148,163,184,0.7)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        var xLabels = Math.min(5, history.length);
        for (var xi = 0; xi <= xLabels; xi++) {
            var t = Math.round((xi / xLabels) * maxT);
            var xpos = padL + (xi / xLabels) * cw;
            var mins = Math.floor(t / 60);
            var secs = t % 60;
            ctx.fillText(mins + ':' + (secs < 10 ? '0' : '') + secs, xpos, padT + ch + 16);
        }

        // Линия графика
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        var lineGrad = ctx.createLinearGradient(padL, 0, padL + cw, 0);
        lineGrad.addColorStop(0, '#6366f1');
        lineGrad.addColorStop(1, '#06b6d4');
        ctx.strokeStyle = lineGrad;

        history.forEach(function (p, i) {
            var x = padL + (p.t / maxT) * cw;
            var y = padT + ch - (p.cpm / maxCpm) * ch;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Точки
        history.forEach(function (p) {
            var x = padL + (p.t / maxT) * cw;
            var y = padT + ch - (p.cpm / maxCpm) * ch;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#6366f1';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });

        // Метка последнего значения
        var last = history[history.length - 1];
        var lx = padL + (last.t / maxT) * cw;
        var ly = padT + ch - (last.cpm / maxCpm) * ch;
        ctx.fillStyle = '#06b6d4';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(last.cpm + ' cpm', Math.min(lx + 6, padL + cw - 52), Math.max(ly - 6, padT + 14));
    }

    window.wpmChartModule = {
        startRecording: startRecording,
        stopRecording: stopRecording,
        renderChart: renderChart
    };
})();

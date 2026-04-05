/**
 * Ambient visual layer: mesh gradient, grid, soft glows, light canvas sparkles.
 * Respects prefers-reduced-motion, body.no-animations, and window.app.animationsEnabled.
 */
(function () {
    var ID = 'zoobAmbientRoot';
    var rafId = null;
    var stars = [];
    var W = 0;
    var H = 0;

    function prefersReducedMotion() {
        try {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (_) {
            return false;
        }
    }

    function isDark() {
        return document.documentElement.classList.contains('dark');
    }

    function animationsAllowed() {
        if (prefersReducedMotion()) return false;
        try {
            if (window.app && window.app.animationsEnabled === false) return false;
        } catch (_) {}
        return !document.body.classList.contains('no-animations');
    }

    function sync() {
        var root = document.getElementById(ID);
        if (!root) return;
        var on = animationsAllowed();
        root.classList.toggle('ambient-paused', !on);
        root.classList.toggle('ambient-dark', isDark());
        root.classList.toggle('ambient-light', !isDark());
        var canvas = root.querySelector('.ambient-canvas');
        if (canvas) {
            if (on) startSparkles(canvas);
            else stopSparkles(canvas);
        }
    }

    function resizeCanvas(canvas) {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.floor(window.innerWidth * dpr);
        H = Math.floor(window.innerHeight * dpr);
        canvas.width = W;
        canvas.height = H;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        stars = [];
        var n = Math.min(48, Math.floor((window.innerWidth * window.innerHeight) / 45000) + 12);
        for (var i = 0; i < n; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: 0.4 + Math.random() * 1.2,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                a: 0.08 + Math.random() * 0.18,
                ph: Math.random() * Math.PI * 2
            });
        }
    }

    function frame(canvas, ctx, t) {
        if (!animationsAllowed() || document.hidden) {
            rafId = null;
            return;
        }
        ctx.clearRect(0, 0, W, H);
        var dark = isDark();
        ctx.fillStyle = dark ? 'rgba(34, 211, 238, 0.35)' : 'rgba(14, 116, 144, 0.25)';
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            s.x += s.vx * (window.devicePixelRatio || 1);
            s.y += s.vy * (window.devicePixelRatio || 1);
            if (s.x < -10) s.x = W + 10;
            if (s.x > W + 10) s.x = -10;
            if (s.y < -10) s.y = H + 10;
            if (s.y > H + 10) s.y = -10;
            var pulse = 0.65 + 0.35 * Math.sin(t * 0.001 + s.ph);
            ctx.globalAlpha = s.a * pulse;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * (window.devicePixelRatio || 1), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        rafId = requestAnimationFrame(function () { frame(canvas, ctx, performance.now()); });
    }

    function startSparkles(canvas) {
        if (!canvas || prefersReducedMotion()) return;
        var ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
        if (!ctx) return;
        stopSparkles(canvas);
        resizeCanvas(canvas);
        canvas.style.opacity = isDark() ? '0.55' : '0.35';
        frame(canvas, ctx, performance.now());
    }

    function stopSparkles(canvas) {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (canvas) {
            var ctx = canvas.getContext('2d');
            if (ctx && W && H) ctx.clearRect(0, 0, W, H);
            canvas.style.opacity = '0';
        }
    }

    function mount() {
        if (document.getElementById(ID)) {
            sync();
            return;
        }
        var el = document.createElement('div');
        el.id = ID;
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML =
            '<div class="ambient-base"></div>' +
            '<div class="ambient-grid"></div>' +
            '<div class="ambient-glow ambient-glow-a"></div>' +
            '<div class="ambient-glow ambient-glow-b"></div>' +
            '<div class="ambient-glow ambient-glow-c"></div>' +
            '<canvas class="ambient-canvas" aria-hidden="true"></canvas>';
        var body = document.body;
        if (body.firstChild) body.insertBefore(el, body.firstChild);
        else body.appendChild(el);

        var canvas = el.querySelector('.ambient-canvas');
        if (typeof ResizeObserver !== 'undefined') {
            var ro = new ResizeObserver(function () {
                if (canvas && animationsAllowed()) resizeCanvas(canvas);
            });
            ro.observe(document.documentElement);
        }
        window.addEventListener('resize', function () {
            if (canvas && animationsAllowed()) resizeCanvas(canvas);
        }, { passive: true });
        document.addEventListener('visibilitychange', function () { sync(); });

        try {
            var mo = new MutationObserver(function () {
                sync();
            });
            mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
            mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        } catch (_) {}

        sync();
    }

    window.ZoobAmbient = { sync: sync };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();

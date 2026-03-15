/**
 * Портальный переход «из будущего»: полный экран, расширяющийся портал, вспышка — переход на другую страницу.
 */
(function () {
    'use strict';
    var duration = 1600;
    var overlay = null;

    function createOverlay() {
        if (overlay) return overlay;
        var style = document.createElement('style');
        style.textContent = [
            '#portal-overlay{position:fixed;inset:0;z-index:999999;pointer-events:none;overflow:hidden;}',
            '#portal-overlay .portal-bg{position:absolute;inset:0;background:linear-gradient(180deg,#0a0e1a 0%,#0f1729 50%,#020617 100%);opacity:0;transition:opacity 0.25s ease;}',
            '#portal-overlay.portal-active .portal-bg{opacity:1;}',
            '#portal-overlay .portal-ring{position:absolute;top:50%;left:50%;width:0;height:0;border-radius:50%;transform:translate(-50%,-50%);',
            'box-shadow:0 0 0 0 rgba(0,229,255,0),0 0 0 0 rgba(139,92,246,0.4);',
            'animation:portal-expand 1.1s ease-out forwards;}',
            '@keyframes portal-expand{0%{width:0;height:0;box-shadow:0 0 0 0 rgba(0,229,255,0),0 0 60px 20px rgba(139,92,246,0.3);}',
            '40%{width:120vmax;height:120vmax;box-shadow:0 0 0 40vmax rgba(0,229,255,0.15),0 0 120px 60px rgba(139,92,246,0.5);}',
            '70%{box-shadow:0 0 0 50vmax rgba(255,255,255,0.1),0 0 150px 80px rgba(139,92,246,0.4);}',
            '100%{width:120vmax;height:120vmax;background:rgba(255,255,255,0.97);box-shadow:0 0 0 50vmax rgba(255,255,255,0.98),0 0 200px 100px rgba(139,92,246,0.2);}}',
            '#portal-overlay .portal-scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,229,255,0.03) 2px,rgba(0,229,255,0.03) 4px);animation:portal-scan 0.8s linear infinite;}',
            '@keyframes portal-scan{0%{transform:translateY(-100%);}100%{transform:translateY(100%);}}'
        ].join('');
        document.head.appendChild(style);
        overlay = document.createElement('div');
        overlay.id = 'portal-overlay';
        overlay.innerHTML = '<div class="portal-bg"></div><div class="portal-scan"></div><div class="portal-ring"></div>';
        document.body.appendChild(overlay);
        return overlay;
    }

    window.portalTo = function (url) {
        if (!url) return;
        var el = createOverlay();
        el.classList.add('portal-active');
        el.style.pointerEvents = 'auto';
        setTimeout(function () {
            window.location.href = url;
        }, duration);
    };
})();

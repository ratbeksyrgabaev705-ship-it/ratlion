/** Браузер push + үн — админ, ресторан, курьер панелдери */
window.PushNotify = (function () {
    const STORAGE = 'pushNotifyEnabled';
    let audioCtx = null;
    const trackers = {};

    function isSupported() {
        return typeof window !== 'undefined' && 'Notification' in window;
    }

    function isEnabled() {
        return localStorage.getItem(STORAGE) !== 'false';
    }

    function setEnabled(v) {
        localStorage.setItem(STORAGE, v ? 'true' : 'false');
    }

    function permission() {
        return isSupported() ? Notification.permission : 'denied';
    }

    function unlockAudio() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
        } catch (e) { /* ignore */ }
    }

    function playSound(variant) {
        if (!isEnabled()) return;
        try {
            unlockAudio();
            const ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            audioCtx = ctx;
            const freqs = variant === 'urgent' ? [660, 880, 1100] : [880, 1100, 880];
            freqs.forEach(function (freq, i) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.16;
                gain.gain.setValueAtTime(0.17, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
                osc.start(t);
                osc.stop(t + 0.26);
            });
        } catch (e) { /* blocked */ }
    }

    function show(title, body, tag) {
        if (!isEnabled() || !isSupported() || Notification.permission !== 'granted') return;
        try {
            const n = new Notification(title, { body: body, tag: tag || title, renotify: true });
            n.onclick = function () { window.focus(); n.close(); };
        } catch (e) { /* ignore */ }
    }

    async function requestPermission() {
        if (!isSupported()) return false;
        if (Notification.permission === 'granted') { setEnabled(true); unlockAudio(); return true; }
        if (Notification.permission === 'denied') return false;
        const ok = (await Notification.requestPermission()) === 'granted';
        setEnabled(ok);
        if (ok) unlockAudio();
        return ok;
    }

    function tracker(key) {
        if (!trackers[key]) trackers[key] = { bootstrapped: false, seen: new Set() };
        return trackers[key];
    }

    function checkNew(key, items, getId, opts) {
        const t = tracker(key);
        const incoming = items.filter(function (item) {
            const id = getId(item);
            return id != null && !t.seen.has(id);
        });
        incoming.forEach(function (item) { t.seen.add(getId(item)); });
        if (!t.bootstrapped) { t.bootstrapped = true; return []; }
        if (!incoming.length || !isEnabled()) return incoming;

        playSound(opts && opts.sound);
        if (opts && opts.vibrate && 'vibrate' in navigator) navigator.vibrate(200);

        incoming.forEach(function (item) {
            if (!opts || !opts.title) return;
            show(
                typeof opts.title === 'function' ? opts.title(item) : opts.title,
                opts.body ? opts.body(item) : '',
                opts.tag ? (typeof opts.tag === 'function' ? opts.tag(item) : opts.tag) : undefined
            );
        });
        if (opts && opts.onNotify) opts.onNotify(incoming);
        return incoming;
    }

    function updateButton(btn, statusEl) {
        if (!btn) return;
        if (!isSupported()) {
            btn.style.display = 'none';
            if (statusEl) statusEl.textContent = 'Push колдобойт';
            return;
        }
        if (permission() === 'granted' && isEnabled()) {
            btn.textContent = '🔔 Күйгүзүлгөн';
            btn.classList.add('push-on');
            if (statusEl) statusEl.textContent = 'Эскертүү иштейт';
        } else if (permission() === 'denied') {
            btn.textContent = '🔕 Уруксат жок';
            btn.classList.remove('push-on');
            if (statusEl) statusEl.textContent = 'Браузерден уруксат бериңиз';
        } else {
            btn.textContent = '🔔 Эскертүүнү күйгүз';
            btn.classList.remove('push-on');
            if (statusEl) statusEl.textContent = 'Жаңы заказ келгенде билесиз';
        }
    }

    async function bindButton(btn, statusEl, onEnabled) {
        if (!btn) return;
        updateButton(btn, statusEl);
        btn.addEventListener('click', async function () {
            const ok = await requestPermission();
            updateButton(btn, statusEl);
            if (ok && onEnabled) onEnabled();
        });
    }

    return {
        isSupported, isEnabled, setEnabled, permission, unlockAudio, playSound, show,
        requestPermission, checkNew, updateButton, bindButton
    };
})();

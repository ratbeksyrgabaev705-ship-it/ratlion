/**
 * GeoLocation — GPS модулу (Safari, Telegram, Android)
 */
window.GeoLocation = (function () {
    'use strict';

    var ACCURACY_GOOD_M = 50;
    var ACCURACY_WARN_M = 500;

    var TEXT = {
        ky: {
            unsupported: 'GPS күйгүзүңүз же Location уруксатын бериңиз',
            insecure: 'Геолокация HTTPS аркылуу гана иштейт.',
            denied: 'GPS күйгүзүңүз же Location уруксатын бериңиз',
            unavailable: 'GPS табылган жок. Оң жогорку GPS баскычын кайра басыңыз.',
            timeout: 'GPS убакыты аяктады. Кайра басыңыз же пинди кол менен жылдырыңыз.',
            approximate: 'GPS так эмес болушу мүмкүн — пинди так жериңе жылдырыңыз.'
        },
        ru: {
            unsupported: 'Включите GPS или разрешите геолокацию',
            insecure: 'Геолокация работает только по HTTPS.',
            denied: 'Включите GPS или разрешите гeолокацию',
            unavailable: 'GPS не найден. Нажмите кнопку GPS ещё раз.',
            timeout: 'Время GPS истекло. Нажмите снова или переместите метку.',
            approximate: 'GPS может быть неточным — переместите метку на точное место.'
        }
    };

    var _activeWatchId = null;
    var _hardTimer = null;
    var _debounceTimer = null;
    var _fallbackTimer = null;

    function resolveLang(lang) {
        if (lang === 'ru' || lang === 'ky') return lang;
        if (window.CustomerI18n && CustomerI18n.getLang) {
            return CustomerI18n.getLang() === 'ru' ? 'ru' : 'ky';
        }
        return 'ky';
    }

    function t(key, lang) {
        var L = resolveLang(lang);
        return (TEXT[L] && TEXT[L][key]) || TEXT.ky[key] || key;
    }

    function isSupported() {
        return typeof navigator !== 'undefined' && !!navigator.geolocation;
    }

    function isSecure() {
        return typeof window !== 'undefined' && window.isSecureContext === true;
    }

    function isTelegramWebView() {
        return /Telegram/i.test(navigator.userAgent || '');
    }

    function isIOS() {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    }

    function getTimeoutMs() {
        return isTelegramWebView() || isIOS() ? 20000 : 15000;
    }

    function normalizePosition(pos) {
        var c = pos.coords || {};
        return {
            latitude: c.latitude,
            longitude: c.longitude,
            accuracy: typeof c.accuracy === 'number' ? c.accuracy : null,
            timestamp: pos.timestamp || Date.now()
        };
    }

    function isValidReading(pos) {
        if (!pos || !pos.coords) return false;
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
    }

    function mapError(err, lang) {
        var code = err && err.code;
        if (code === 1) return new Error(t('denied', lang));
        if (code === 2) return new Error(t('unavailable', lang));
        if (code === 3) return new Error(t('timeout', lang));
        return new Error(t('unsupported', lang));
    }

    function cleanup() {
        if (_activeWatchId != null && navigator.geolocation) {
            try { navigator.geolocation.clearWatch(_activeWatchId); } catch (e) { /* ignore */ }
            _activeWatchId = null;
        }
        if (_hardTimer) { clearTimeout(_hardTimer); _hardTimer = null; }
        if (_debounceTimer) { clearTimeout(_debounceTimer); _debounceTimer = null; }
        if (_fallbackTimer) { clearTimeout(_fallbackTimer); _fallbackTimer = null; }
    }

    function runGeolocation(lang, highAccuracy, timeoutMs) {
        return new Promise(function (resolve, reject) {
            var settled = false;
            var bestRaw = null;
            var geoOpts = {
                enableHighAccuracy: highAccuracy,
                timeout: timeoutMs,
                maximumAge: 0
            };

            function finish(raw) {
                if (settled) return;
                settled = true;
                cleanup();
                var n = normalizePosition(raw);
                var acc = n.accuracy;
                n.approximate = typeof acc === 'number' ? acc > ACCURACY_GOOD_M : false;
                n.accuracyMeters = acc;
                resolve(n);
            }

            function fail(err) {
                if (settled) return;
                if (bestRaw) {
                    finish(bestRaw);
                    return;
                }
                settled = true;
                cleanup();
                reject(mapError(err, lang));
            }

            function onSuccess(pos) {
                if (settled || !isValidReading(pos)) return;
                if (!bestRaw || (pos.coords.accuracy || 99999) < (bestRaw.coords.accuracy || 99999)) {
                    bestRaw = pos;
                }
                var acc = pos.coords.accuracy;
                if (acc == null || acc <= ACCURACY_GOOD_M) {
                    if (_debounceTimer) clearTimeout(_debounceTimer);
                    _debounceTimer = setTimeout(function () { finish(bestRaw); }, acc == null ? 800 : 300);
                }
            }

            function onError(err) {
                if (err && err.code === 1) fail(err);
            }

            _hardTimer = setTimeout(function () {
                if (bestRaw) finish(bestRaw);
                else fail({ code: 3 });
            }, timeoutMs + 800);

            _activeWatchId = navigator.geolocation.watchPosition(onSuccess, onError, geoOpts);
            navigator.geolocation.getCurrentPosition(onSuccess, function () { /* watch */ }, geoOpts);
        });
    }

    /**
     * GPS алуу — iOS/Telegram үчүн:user gesture ичинде чакыр!
     */
    function getCurrentPosition(options) {
        options = options || {};
        var lang = resolveLang(options.lang);

        if (!isSecure()) return Promise.reject(new Error(t('insecure', lang)));
        if (!isSupported()) return Promise.reject(new Error(t('unsupported', lang)));

        var timeoutMs = getTimeoutMs();

        return runGeolocation(lang, true, timeoutMs).catch(function (err) {
            if (err.message === t('denied', lang)) throw err;
            return runGeolocation(lang, false, 10000);
        });
    }

    function cancel() {
        cleanup();
    }

    function shouldWarnApproximate(result) {
        if (!result) return false;
        return typeof result.accuracyMeters === 'number' && result.accuracyMeters > ACCURACY_WARN_M;
    }

    function getApproximateWarning(lang) {
        return t('approximate', lang);
    }

    return {
        isSupported: isSupported,
        isSecure: isSecure,
        isTelegramWebView: isTelegramWebView,
        isIOS: isIOS,
        getCurrentPosition: getCurrentPosition,
        cancel: cancel,
        shouldWarnApproximate: shouldWarnApproximate,
        getApproximateWarning: getApproximateWarning,
        t: t
    };
})();

/**
 * GeoLocation — production GPS модулу
 */
window.GeoLocation = (function () {
    'use strict';

    /** ≤50м — дароо кабыл алуу */
    var ACCURACY_GOOD_M = 50;
    /** ≤120м — кабыл алуу (debounce кийин) */
    var ACCURACY_ACCEPT_M = 120;
    /** >2000м — баш калаadan башка жер — чыгарып салуу */
    var ACCURACY_REJECT_M = 2000;

    var TEXT = {
        ky: {
            unsupported: 'GPS күйгүзүңүз же Location уруксатын бериңиз',
            insecure: 'Геолокация HTTPS аркылуу гана иштейт.',
            denied: 'GPS күйгүзүңүз же Location уруксатын бериңиз',
            unavailable: 'GPS сигналы табылган жок. Ачык абада кайра аракет кылыңыз.',
            timeout: 'GPS күтүү убактысы аяктады. Кайра аракет кылыңыз.',
            inaccurate: 'GPS так эмес. Telegram эмес — Safari же Chrome\'ден ачыңыз, «Так жайгашкан жер» күйгүзүңүз.',
            approximate: 'Так дарек үчүн «Так жайгашкан жер» (Precise Location) күйгүзүңүз.',
            telegramHint: 'Telegram\'да GPS туура эмес болушу мүмкүн. Safari/Chrome\'ден ачыңыз.'
        },
        ru: {
            unsupported: 'Включите GPS или разрешите доступ к геолокации',
            insecure: 'Геолокация работает только по HTTPS.',
            denied: 'Включите GPS или разрешите доступ к геолокации',
            unavailable: 'GPS-сигнал не найден. Попробуйте на открытом месте.',
            timeout: 'Время ожидания GPS истекло. Попробуйте снова.',
            inaccurate: 'GPS неточный. Откройте сайт в Safari или Chrome, включите «Точное местоположение».',
            approximate: 'Для точного адреса включите «Точное местоположение» (Precise Location).',
            telegramHint: 'В Telegram GPS может быть неточным. Откройте сайт в Safari/Chrome.'
        }
    };

    var _activeWatchId = null;
    var _hardTimer = null;
    var _debounceTimer = null;

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

    function getTimeoutMs() {
        return 15000;
    }

    function getDebounceMs() {
        return isTelegramWebView() ? 6000 : 4000;
    }

    function getGeoOptions() {
        return {
            enableHighAccuracy: true,
            timeout: getTimeoutMs(),
            maximumAge: 0
        };
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
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return false;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
        var acc = pos.coords.accuracy;
        if (typeof acc === 'number' && acc > ACCURACY_REJECT_M) return false;
        return true;
    }

    function mapError(err, lang) {
        if (err && err.inaccurate) return new Error(t('inaccurate', lang));
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
        if (_hardTimer) {
            clearTimeout(_hardTimer);
            _hardTimer = null;
        }
        if (_debounceTimer) {
            clearTimeout(_debounceTimer);
            _debounceTimer = null;
        }
    }

    function getCurrentPosition(options) {
        options = options || {};
        var lang = resolveLang(options.lang);

        return new Promise(function (resolve, reject) {
            if (!isSecure()) {
                reject(new Error(t('insecure', lang)));
                return;
            }
            if (!isSupported()) {
                reject(new Error(t('unsupported', lang)));
                return;
            }

            var settled = false;
            var bestRaw = null;
            var permissionApproximate = false;
            var geoOpts = getGeoOptions();
            var debounceMs = getDebounceMs();

            if (navigator.permissions && navigator.permissions.query) {
                navigator.permissions.query({ name: 'geolocation' }).then(function (r) {
                    permissionApproximate = r && r.accuracy === 'approximate';
                }).catch(function () { /* ignore */ });
            }

            function finish(raw) {
                if (settled) return;
                var acc = raw.coords.accuracy;
                if (typeof acc === 'number' && acc > ACCURACY_ACCEPT_M) {
                    fail({ inaccurate: true });
                    return;
                }
                settled = true;
                cleanup();

                var normalized = normalizePosition(raw);
                normalized.approximate = (typeof acc === 'number' && acc > ACCURACY_GOOD_M) || permissionApproximate;
                normalized.permissionApproximate = permissionApproximate;
                normalized.accuracyMeters = normalized.accuracy;
                resolve(normalized);
            }

            function fail(err) {
                if (settled) return;
                settled = true;
                cleanup();
                reject(mapError(err, lang));
            }

            function tryFinishBest() {
                if (!bestRaw) {
                    fail({ code: 3 });
                    return;
                }
                finish(bestRaw);
            }

            function scheduleFinish() {
                if (_debounceTimer) clearTimeout(_debounceTimer);
                _debounceTimer = setTimeout(function () {
                    if (!bestRaw) return;
                    var acc = bestRaw.coords.accuracy;
                    if (typeof acc === 'number' && acc <= ACCURACY_ACCEPT_M) {
                        finish(bestRaw);
                    }
                }, debounceMs);
            }

            function onSuccess(pos) {
                if (settled || !isValidReading(pos)) return;

                if (!bestRaw || pos.coords.accuracy < bestRaw.coords.accuracy) {
                    bestRaw = pos;
                }

                var acc = pos.coords.accuracy;
                if (typeof acc === 'number' && acc <= ACCURACY_GOOD_M) {
                    finish(pos);
                    return;
                }

                if (typeof acc === 'number' && acc <= ACCURACY_ACCEPT_M) {
                    scheduleFinish();
                }
            }

            function onError(err) {
                if (err && err.code === 1) fail(err);
            }

            _hardTimer = setTimeout(function () {
                tryFinishBest();
            }, geoOpts.timeout + 500);

            _activeWatchId = navigator.geolocation.watchPosition(onSuccess, onError, geoOpts);
            navigator.geolocation.getCurrentPosition(onSuccess, function () { /* watch уланат */ }, geoOpts);
        });
    }

    function cancel() {
        cleanup();
    }

    function shouldWarnApproximate(result) {
        if (!result) return false;
        if (result.permissionApproximate) return true;
        return typeof result.accuracyMeters === 'number' && result.accuracyMeters > ACCURACY_GOOD_M;
    }

    function getApproximateWarning(lang) {
        return t('approximate', lang);
    }

    function getTelegramHint(lang) {
        return t('telegramHint', lang);
    }

    return {
        ACCURACY_GOOD_M: ACCURACY_GOOD_M,
        ACCURACY_ACCEPT_M: ACCURACY_ACCEPT_M,
        isSupported: isSupported,
        isSecure: isSecure,
        isTelegramWebView: isTelegramWebView,
        getCurrentPosition: getCurrentPosition,
        cancel: cancel,
        shouldWarnApproximate: shouldWarnApproximate,
        getApproximateWarning: getApproximateWarning,
        getTelegramHint: getTelegramHint,
        t: t
    };
})();

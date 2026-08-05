/**
 * GeoLocation — production GPS модулу
 */
window.GeoLocation = (function () {
    'use strict';

    var ACCURACY_GOOD_M = 50;
    var ACCURACY_APPROXIMATE_M = 500;

    var TEXT = {
        ky: {
            unsupported: 'GPS күйгүзүңүз же Location уруксатын бериңиз',
            insecure: 'Геолокация HTTPS аркылуу гана иштейт.',
            denied: 'GPS күйгүзүңүз же Location уруксатын бериңиз',
            unavailable: 'GPS сигналы табылган жок. Ачык абада кайра аракет кылыңыз.',
            timeout: 'GPS күтүү убактысы аяктады. «Менин жайгашкан жерим» баскычын кайра басыңыз.',
            approximate: 'Так дарек үчүн «Так жайгашкан жер» (Precise Location) күйгүзүңүз.'
        },
        ru: {
            unsupported: 'Включите GPS или разрешите доступ к геолокации',
            insecure: 'Геолокация работает только по HTTPS.',
            denied: 'Включите GPS или разрешите доступ к гeолокации',
            unavailable: 'GPS-сигнал не найден. Попробуйте на открытом месте.',
            timeout: 'Время ожидания GPS истекло. Нажмите кнопку местоположения ещё раз.',
            approximate: 'Для точного адреса включите «Точное местоположение» (Precise Location).'
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
        return isTelegramWebView() ? 10000 : 15000;
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

    function mapError(err, lang) {
        var code = err && err.code;
        if (code === 1) return new Error(t('denied', lang));
        if (code === 2) return new Error(t('unavailable', lang));
        if (code === 3) return new Error(t('timeout', lang));
        return new Error(t('unsupported', lang));
    }

    function isApproximateAccuracy(m) {
        return typeof m === 'number' && m > ACCURACY_APPROXIMATE_M;
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
            var debounceMs = isTelegramWebView() ? 1200 : 2500;

            if (navigator.permissions && navigator.permissions.query) {
                navigator.permissions.query({ name: 'geolocation' }).then(function (r) {
                    permissionApproximate = r && r.accuracy === 'approximate';
                }).catch(function () { /* ignore */ });
            }

            function finish(raw) {
                if (settled) return;
                settled = true;
                cleanup();

                var normalized = normalizePosition(raw);
                normalized.approximate = isApproximateAccuracy(normalized.accuracy) || permissionApproximate;
                normalized.permissionApproximate = permissionApproximate;
                normalized.accuracyMeters = normalized.accuracy;
                resolve(normalized);
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

            function scheduleFinish() {
                if (_debounceTimer) clearTimeout(_debounceTimer);
                _debounceTimer = setTimeout(function () {
                    if (bestRaw) finish(bestRaw);
                }, debounceMs);
            }

            function onSuccess(pos) {
                if (settled || !pos || !pos.coords) return;
                var lat = pos.coords.latitude;
                var lng = pos.coords.longitude;
                if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

                if (!bestRaw || pos.coords.accuracy < bestRaw.coords.accuracy) {
                    bestRaw = pos;
                }

                if (typeof pos.coords.accuracy === 'number' && pos.coords.accuracy <= ACCURACY_GOOD_M) {
                    finish(pos);
                    return;
                }

                scheduleFinish();
            }

            function onError(err) {
                if (err && err.code === 1) fail(err);
            }

            _hardTimer = setTimeout(function () {
                if (bestRaw) finish(bestRaw);
                else fail({ code: 3 });
            }, geoOpts.timeout + 1000);

            _activeWatchId = navigator.geolocation.watchPosition(onSuccess, onError, geoOpts);

            navigator.geolocation.getCurrentPosition(onSuccess, function () {
                /* watchPosition улантат */
            }, geoOpts);
        });
    }

    function cancel() {
        cleanup();
    }

    function shouldWarnApproximate(result) {
        if (!result) return false;
        if (result.permissionApproximate) return true;
        return isApproximateAccuracy(result.accuracyMeters);
    }

    function getApproximateWarning(lang) {
        return t('approximate', lang);
    }

    return {
        ACCURACY_GOOD_M: ACCURACY_GOOD_M,
        ACCURACY_APPROXIMATE_M: ACCURACY_APPROXIMATE_M,
        isSupported: isSupported,
        isSecure: isSecure,
        isTelegramWebView: isTelegramWebView,
        getCurrentPosition: getCurrentPosition,
        cancel: cancel,
        shouldWarnApproximate: shouldWarnApproximate,
        getApproximateWarning: getApproximateWarning,
        t: t
    };
})();

/**
 * GeoLocation — production GPS модулу
 * Safari, Telegram WebView, Android Chrome үчүн оптималдаштырылган.
 */
window.GeoLocation = (function () {
    'use strict';

    var GEO_OPTIONS = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
    };

    /** метр — бул чекиттен төмөн болсо, GPS так деп эсептелет */
    var ACCURACY_GOOD_M = 50;
    /** метр — булдан жогору болсо, approximate деп эскертүү */
    var ACCURACY_APPROXIMATE_M = 500;

    var TEXT = {
        ky: {
            unsupported: 'GPS күйгүзүңүз же Location уруксатын бериңиз',
            insecure: 'Геолокация HTTPS аркылуу гана иштейт. Сайтты коопсуз байланыш аркылуу ачыңыз.',
            denied: 'GPS күйгүзүңүз же Location уруксатын бериңиз',
            unavailable: 'GPS сигналы табылган жок. Ачык абада кайра аракет кылыңыз.',
            timeout: 'GPS күтүү убактысы аяктады. Кайра аракет кылыңыз.',
            approximate: 'Так дарек үчүн телефондо «Так жайгашкан жер» (Precise Location) күйгүзүңүз.',
            locating: 'GPS күтүлүүдө...'
        },
        ru: {
            unsupported: 'Включите GPS или разрешите доступ к геолокации',
            insecure: 'Геолокация работает только по HTTPS. Откройте сайт по защищённому соединению.',
            denied: 'Включите GPS или разрешите доступ к геолокации',
            unavailable: 'GPS-сигнал не найден. Попробуйте на открытом месте.',
            timeout: 'Время ожидания GPS истекло. Попробуйте снова.',
            approximate: 'Для точного адреса включите «Точное местоположение» (Precise Location) на телефоне.',
            locating: 'Ожидание GPS...'
        }
    };

    var _activeWatchId = null;
    var _activeTimer = null;
    var _activePromise = null;

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

    function normalizePosition(pos) {
        var c = pos.coords || {};
        return {
            latitude: c.latitude,
            longitude: c.longitude,
            accuracy: typeof c.accuracy === 'number' ? c.accuracy : null,
            altitude: c.altitude != null ? c.altitude : null,
            heading: c.heading != null ? c.heading : null,
            speed: c.speed != null ? c.speed : null,
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

    function isApproximateAccuracy(accuracyMeters) {
        return typeof accuracyMeters === 'number' && accuracyMeters > ACCURACY_APPROXIMATE_M;
    }

    function queryPermissionAccuracy() {
        if (!navigator.permissions || !navigator.permissions.query) {
            return Promise.resolve(null);
        }
        return navigator.permissions.query({ name: 'geolocation' })
            .then(function (result) {
                return result && result.accuracy ? result.accuracy : null;
            })
            .catch(function () { return null; });
    }

    function cleanupActiveWatch() {
        if (_activeWatchId != null && navigator.geolocation) {
            try { navigator.geolocation.clearWatch(_activeWatchId); } catch (e) { /* ignore */ }
            _activeWatchId = null;
        }
        if (_activeTimer) {
            clearTimeout(_activeTimer);
            _activeTimer = null;
        }
    }

    /**
     * Жаңы GPS координатасын watchPosition + getCurrentPosition аркылуу алат.
     * Cached координата колдонулбайт (maximumAge: 0).
     */
    function getCurrentPosition(options) {
        options = options || {};
        var lang = resolveLang(options.lang);

        if (_activePromise) return _activePromise;

        _activePromise = new Promise(function (resolve, reject) {
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

            function finish(raw, meta) {
                if (settled) return;
                settled = true;
                cleanupActiveWatch();
                _activePromise = null;

                var normalized = normalizePosition(raw);
                normalized.approximate = !!(meta && meta.approximate);
                normalized.permissionApproximate = permissionApproximate;
                normalized.accuracyMeters = normalized.accuracy;

                resolve(normalized);
            }

            function fail(err) {
                if (settled) return;
                if (bestRaw) {
                    finish(bestRaw, {
                        approximate: isApproximateAccuracy(bestRaw.coords.accuracy) || permissionApproximate
                    });
                    return;
                }
                settled = true;
                cleanupActiveWatch();
                _activePromise = null;
                reject(mapError(err, lang));
            }

            function onSuccess(pos) {
                if (!pos || !pos.coords) return;
                if (typeof pos.coords.latitude !== 'number' || typeof pos.coords.longitude !== 'number') return;
                if (isNaN(pos.coords.latitude) || isNaN(pos.coords.longitude)) return;

                if (!bestRaw || pos.coords.accuracy < bestRaw.coords.accuracy) {
                    bestRaw = pos;
                }

                if (typeof pos.coords.accuracy === 'number' && pos.coords.accuracy <= ACCURACY_GOOD_M) {
                    finish(pos, { approximate: permissionApproximate });
                }
            }

            function onHardError(err) {
                if (err && err.code === 1) fail(err);
            }

            queryPermissionAccuracy().then(function (acc) {
                permissionApproximate = acc === 'approximate';
            }).finally(function () {
                _activeTimer = setTimeout(function () {
                    if (bestRaw) {
                        finish(bestRaw, {
                            approximate: isApproximateAccuracy(bestRaw.coords.accuracy) || permissionApproximate
                        });
                    } else {
                        fail({ code: 3 });
                    }
                }, GEO_OPTIONS.timeout);

                _activeWatchId = navigator.geolocation.watchPosition(
                    onSuccess,
                    onHardError,
                    GEO_OPTIONS
                );

                navigator.geolocation.getCurrentPosition(
                    onSuccess,
                    function () { /* watchPosition улантат */ },
                    GEO_OPTIONS
                );
            });
        });

        return _activePromise;
    }

    function cancel() {
        cleanupActiveWatch();
        _activePromise = null;
    }

    function getApproximateWarning(lang) {
        return t('approximate', lang);
    }

    function shouldWarnApproximate(result) {
        if (!result) return false;
        if (result.permissionApproximate) return true;
        return isApproximateAccuracy(result.accuracyMeters);
    }

    return {
        GEO_OPTIONS: GEO_OPTIONS,
        ACCURACY_GOOD_M: ACCURACY_GOOD_M,
        ACCURACY_APPROXIMATE_M: ACCURACY_APPROXIMATE_M,
        isSupported: isSupported,
        isSecure: isSecure,
        isTelegramWebView: isTelegramWebView,
        getCurrentPosition: getCurrentPosition,
        cancel: cancel,
        queryPermissionAccuracy: queryPermissionAccuracy,
        shouldWarnApproximate: shouldWarnApproximate,
        getApproximateWarning: getApproximateWarning,
        t: t
    };
})();

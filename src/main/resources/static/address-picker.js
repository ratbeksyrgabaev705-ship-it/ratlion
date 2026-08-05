/**
 * AddressPicker — GPS + native map apps
 */
window.AddressPicker = (function () {
    'use strict';

    var GEOCODE_TIMEOUT_MS = 8000;
    var SAFETY_TIMEOUT_MS = 18000;

    var TEXT = {
        ky: {
            selectOnMapCheckout: 'Картада көрүү үчүн басыңыз',
            myLocation: 'Менин жайгашкан жеримди колдонуу',
            locating: 'Дарек табылууда...',
            gpsError: 'GPS күйгүзүңүз же Location уруксатын бериңиз',
            mapModuleMissing: 'Карта модулу жükтүүрүлгөн жок'
        },
        ru: {
            selectOnMapCheckout: 'Нажмите, чтобы открыть карту',
            myLocation: 'Использовать моё местоположение',
            locating: 'Определяем адрес...',
            gpsError: 'Включите GPS или разрешите доступ к гeолокации',
            mapModuleMissing: 'Модуль карт не загружен'
        }
    };

    var _slug = '';
    var _latInput = null;
    var _lngInput = null;
    var _addressInput = null;
    var _display = null;
    var _fieldBox = null;
    var _gpsBtn = null;
    var _toastEl = null;
    var _locating = false;
    var _lastCoords = null;

    function lang() {
        if (window.CustomerI18n && CustomerI18n.getLang) {
            return CustomerI18n.getLang() === 'ru' ? 'ru' : 'ky';
        }
        return 'ky';
    }

    function t(key) {
        var L = lang();
        return (TEXT[L] && TEXT[L][key]) || TEXT.ky[key] || key;
    }

    function storageKey(field) {
        return 'checkout:' + (_slug || 'default') + ':' + field;
    }

    function ensureToast() {
        if (_toastEl) return;
        _toastEl = document.createElement('div');
        _toastEl.id = 'apGeoToast';
        _toastEl.className = 'ap-geo-toast hidden';
        document.body.appendChild(_toastEl);
    }

    function showToast(msg, durationMs) {
        ensureToast();
        _toastEl.textContent = msg;
        _toastEl.classList.remove('hidden');
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(function () {
            _toastEl.classList.add('hidden');
        }, durationMs || 4200);
    }

    function currentAddressText() {
        return (_addressInput && _addressInput.value.trim()) || '';
    }

    function setLocating(on) {
        _locating = !!on;
        if (_display) {
            _display.classList.toggle('ap-locating', on);
            if (on) {
                _display.textContent = t('locating');
            } else {
                var saved = currentAddressText();
                updateDisplay(saved);
            }
        }
        if (_fieldBox) _fieldBox.classList.toggle('ap-locating', on);
        if (_gpsBtn) {
            _gpsBtn.disabled = on;
            _gpsBtn.classList.toggle('ap-busy', on);
        }
    }

    function updateDisplay(text) {
        if (_display) {
            _display.textContent = text || t('selectOnMapCheckout');
            _display.classList.toggle('ap-empty', !text);
        }
        if (_addressInput) _addressInput.value = text || '';
    }

    function applyLocation(lat, lng, address) {
        _lastCoords = { latitude: lat, longitude: lng, address: address || '' };
        if (_latInput) _latInput.value = lat != null ? String(lat) : '';
        if (_lngInput) _lngInput.value = lng != null ? String(lng) : '';
        updateDisplay(address || '');
        try {
            if (address) localStorage.setItem(storageKey('address'), address);
            if (lat != null) localStorage.setItem(storageKey('latitude'), String(lat));
            if (lng != null) localStorage.setItem(storageKey('longitude'), String(lng));
        } catch (e) { /* ignore */ }
        return _lastCoords;
    }

    function reverseGeocode(lat, lng) {
        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timer = controller ? setTimeout(function () { controller.abort(); }, GEOCODE_TIMEOUT_MS) : null;

        return fetch('/api/geocode/reverse?lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lng) + '&lang=ru', {
            signal: controller ? controller.signal : undefined
        })
            .then(function (r) {
                if (!r.ok) throw new Error('geocode');
                return r.json();
            })
            .then(function (data) {
                var addr = (data && (data.address || data.fullAddress)) || '';
                if (!addr) addr = lat.toFixed(5) + ', ' + lng.toFixed(5);
                return applyLocation(lat, lng, addr);
            })
            .catch(function () {
                return applyLocation(lat, lng, lat.toFixed(5) + ', ' + lng.toFixed(5));
            })
            .finally(function () {
                if (timer) clearTimeout(timer);
            });
    }

    function withSafetyTimeout(promise, ms, message) {
        return new Promise(function (resolve, reject) {
            var done = false;
            var timer = setTimeout(function () {
                if (done) return;
                done = true;
                if (window.GeoLocation) GeoLocation.cancel();
                reject(new Error(message || t('gpsError')));
            }, ms);

            promise.then(function (v) {
                if (done) return;
                done = true;
                clearTimeout(timer);
                resolve(v);
            }).catch(function (e) {
                if (done) return;
                done = true;
                clearTimeout(timer);
                reject(e);
            });
        });
    }

    function fetchFreshLocation() {
        if (!window.GeoLocation) throw new Error(t('gpsError'));
        if (!GeoLocation.isSecure()) throw new Error(GeoLocation.t('insecure', lang()));
        if (!GeoLocation.isSupported()) throw new Error(GeoLocation.t('unsupported', lang()));

        var chain = GeoLocation.getCurrentPosition({ lang: lang() })
            .then(function (geo) {
                if (GeoLocation.shouldWarnApproximate(geo)) {
                    showToast(GeoLocation.getApproximateWarning(lang()), 5000);
                }
                return reverseGeocode(geo.latitude, geo.longitude);
            });

        return withSafetyTimeout(chain, SAFETY_TIMEOUT_MS, GeoLocation.t('timeout', lang()));
    }

    function runLocationTask(task) {
        if (_locating) {
            return Promise.reject(new Error(t('locating')));
        }

        setLocating(true);
        return task()
            .catch(function (err) {
                showToast(err.message || t('gpsError'));
                throw err;
            })
            .finally(function () {
                setLocating(false);
            });
    }

    function ensureLocation() {
        return runLocationTask(fetchFreshLocation);
    }

    function useMyLocation() {
        return runLocationTask(function () {
            return fetchFreshLocation().then(function (result) {
                if (result.address) showToast(result.address, 2500);
                return result;
            });
        });
    }

    function openNativeMaps() {
        runLocationTask(function () {
            return fetchFreshLocation().then(function (data) {
                if (!window.MapNavigator) {
                    showToast(t('mapModuleMissing'));
                    return data;
                }
                MapNavigator.showLocation({
                    latitude: data.latitude,
                    longitude: data.longitude,
                    address: data.address
                });
                return data;
            });
        });
    }

    function injectGpsButton() {
        if (!_fieldBox || _gpsBtn) return;

        _gpsBtn = document.createElement('button');
        _gpsBtn.type = 'button';
        _gpsBtn.id = 'apUseMyLocationBtn';
        _gpsBtn.className = 'ap-use-location-btn';
        _gpsBtn.innerHTML =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
            '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/>' +
            '<circle cx="12" cy="12" r="3" fill="currentColor"/>' +
            '<line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" stroke-width="1.6"/>' +
            '<line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" stroke-width="1.6"/>' +
            '<line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" stroke-width="1.6"/>' +
            '<line x1="18" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1.6"/></svg>' +
            '<span id="apUseMyLocationText"></span>';

        _fieldBox.insertAdjacentElement('afterend', _gpsBtn);
        _gpsBtn.querySelector('#apUseMyLocationText').textContent = t('myLocation');
        _gpsBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            useMyLocation();
        });
    }

    function bindCheckout(options) {
        options = options || {};
        _slug = options.slug || window.restaurantSlug || (window.RESTAURANT && window.RESTAURANT.slug) || 'default';

        _fieldBox = document.getElementById('addressFieldBox');
        _display = document.getElementById('addressDisplay');
        _latInput = document.getElementById('latitude');
        _lngInput = document.getElementById('longitude');
        _addressInput = document.getElementById('address');

        if (_display && _addressInput && _addressInput.value) {
            updateDisplay(_addressInput.value);
        } else if (_display) {
            updateDisplay('');
        }

        injectGpsButton();

        if (_fieldBox) {
            _fieldBox.addEventListener('click', function (e) {
                if (e.target.closest('#apUseMyLocationBtn')) return;
                e.preventDefault();
                openNativeMaps();
            });
        }

        if (window.GeoLocation && !GeoLocation.isSecure()) {
            showToast(GeoLocation.t('insecure', lang()), 6000);
        }

        return {
            openMaps: openNativeMaps,
            ensureLocation: ensureLocation,
            useMyLocation: useMyLocation,
            updateDisplay: updateDisplay
        };
    }

    function refreshI18n() {
        if (_gpsBtn) {
            var label = _gpsBtn.querySelector('#apUseMyLocationText');
            if (label) label.textContent = t('myLocation');
        }
        if (_display && !_locating) {
            updateDisplay(currentAddressText());
        }
    }

    return {
        bindCheckout: bindCheckout,
        ensureLocation: ensureLocation,
        useMyLocation: useMyLocation,
        locateMe: useMyLocation,
        openMaps: openNativeMaps,
        refreshI18n: refreshI18n,
        t: t
    };
})();

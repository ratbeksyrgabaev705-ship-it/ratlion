/**
 * AddressPicker — GPS + native map apps (Google, 2GIS, Yandex…)
 * Дарек тандоо: телефондогу карта колдонмосун ачат, дарек GPS менен автоматтык толтурат.
 */
window.AddressPicker = (function () {
    'use strict';

    var TEXT = {
        ky: {
            selectOnMapCheckout: 'Картада көрүү үчүн басыңыз',
            locating: 'Дарек табылууда...',
            gpsOff: 'GPS күйгүзүңүз',
            gpsDenied: 'Геолокацияга уруксат бериңиз'
        },
        ru: {
            selectOnMapCheckout: 'Нажмите, чтобы открыть карту',
            locating: 'Определяем адрес...',
            gpsOff: 'Включите GPS',
            gpsDenied: 'Разрешите геолокацию'
        }
    };

    var _slug = '';
    var _latInput = null;
    var _lngInput = null;
    var _addressInput = null;
    var _display = null;
    var _fieldBox = null;
    var _locating = false;
    var _ensurePromise = null;

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

    function setLocating(on) {
        _locating = !!on;
        if (_display) {
            _display.classList.toggle('ap-locating', on);
            if (on) _display.textContent = t('locating');
        }
        if (_fieldBox) _fieldBox.classList.toggle('ap-locating', on);
    }

    function updateDisplay(text) {
        if (_display) {
            _display.textContent = text || t('selectOnMapCheckout');
            _display.classList.toggle('ap-empty', !text);
        }
        if (_addressInput) _addressInput.value = text || '';
    }

    function applyLocation(lat, lng, address) {
        if (_latInput) _latInput.value = lat != null ? String(lat) : '';
        if (_lngInput) _lngInput.value = lng != null ? String(lng) : '';
        updateDisplay(address || '');
        try {
            if (address) localStorage.setItem(storageKey('address'), address);
            if (lat != null) localStorage.setItem(storageKey('latitude'), String(lat));
            if (lng != null) localStorage.setItem(storageKey('longitude'), String(lng));
        } catch (e) { /* ignore */ }
        return { latitude: lat, longitude: lng, address: address || '' };
    }

    function reverseGeocode(lat, lng) {
        return fetch('/api/geocode/reverse?lat=' + lat + '&lon=' + lng + '&lang=ru')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var addr = (data && (data.address || data.fullAddress)) || '';
                if (!addr) addr = lat.toFixed(5) + ', ' + lng.toFixed(5);
                return applyLocation(lat, lng, addr);
            })
            .catch(function () {
                return applyLocation(lat, lng, lat.toFixed(5) + ', ' + lng.toFixed(5));
            });
    }

    function getGpsPosition(forceFresh) {
        return new Promise(function (resolve, reject) {
            if (!navigator.geolocation) {
                reject(new Error(t('gpsOff')));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                function (pos) { resolve(pos); },
                function (err) {
                    reject(new Error(err && err.code === 1 ? t('gpsDenied') : t('gpsOff')));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: forceFresh ? 0 : 120000
                }
            );
        });
    }

    function locateAndFill(forceFresh) {
        return getGpsPosition(forceFresh).then(function (pos) {
            return reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        });
    }

    function ensureLocation(forceFresh) {
        if (_ensurePromise && !forceFresh) return _ensurePromise;

        var hasData = _latInput && _latInput.value && _addressInput && _addressInput.value.trim().length >= 3;
        if (!forceFresh && hasData) {
            return Promise.resolve({
                latitude: parseFloat(_latInput.value),
                longitude: parseFloat(_lngInput.value),
                address: _addressInput.value.trim()
            });
        }

        setLocating(true);
        _ensurePromise = locateAndFill(!!forceFresh)
            .finally(function () {
                setLocating(false);
                _ensurePromise = null;
            });

        return _ensurePromise;
    }

    function openNativeMaps() {
        function openWith(data) {
            if (!window.MapNavigator) {
                alert('Карта модулу жükтүүрүлгөн жок');
                return;
            }
            MapNavigator.viewAddress({
                latitude: data.latitude,
                longitude: data.longitude,
                address: data.address
            });
        }

        if (_latInput && _latInput.value && _lngInput && _lngInput.value) {
            openWith({
                latitude: parseFloat(_latInput.value),
                longitude: parseFloat(_lngInput.value),
                address: _addressInput ? _addressInput.value : ''
            });
            return;
        }

        setLocating(true);
        locateAndFill(true)
            .then(openWith)
            .catch(function (err) {
                alert(err.message || t('gpsDenied'));
            })
            .finally(function () { setLocating(false); });
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

        function onAddressTap(e) {
            e.preventDefault();
            openNativeMaps();
        }

        if (_fieldBox) _fieldBox.addEventListener('click', onAddressTap);
        if (_display) _display.addEventListener('click', onAddressTap);

        if (options.autoLocate !== false && (!_latInput || !_latInput.value)) {
            setTimeout(function () {
                ensureLocation(false).catch(function () { /* user can tap later */ });
            }, 400);
        }

        return {
            openMaps: openNativeMaps,
            ensureLocation: ensureLocation,
            updateDisplay: updateDisplay
        };
    }

    function refreshI18n() {
        if (_display && !_locating) {
            if (!_addressInput || !_addressInput.value) {
                _display.textContent = t('selectOnMapCheckout');
            }
        }
    }

    return {
        bindCheckout: bindCheckout,
        ensureLocation: ensureLocation,
        openMaps: openNativeMaps,
        refreshI18n: refreshI18n,
        t: t
    };
})();

/**
 * AddressPicker — карта + ортодогу пин + GPS
 */
window.AddressPicker = (function () {
    'use strict';

    var DEFAULT_CENTER = [42.8746, 74.5698];
    var DEFAULT_ZOOM = 16;
    var GPS_ZOOM = 18;

    var TEXT = {
        ky: {
            pickOnMap: 'Даректи картадан тандаңыз',
            writeAddress: 'Даректи жазуу',
            title: 'Даректи тандоо',
            myLocation: 'Менин жерим',
            confirm: 'Бул даректи тандоо',
            locating: 'GPS...',
            geocoding: 'Дарек табылууда...',
            pickOnMapCheckout: 'Даректи жазуу'
        },
        ru: {
            pickOnMap: 'Выберите адрес на карте',
            writeAddress: 'Указать адрес',
            title: 'Выбор адреса',
            myLocation: 'Моё место',
            confirm: 'Выбрать этот адрес',
            locating: 'GPS...',
            geocoding: 'Определяем адрес...',
            pickOnMapCheckout: 'Указать адрес'
        }
    };

    var _map = null;
    var _overlay = null;
    var _debounceGeo = null;
    var _geocodeReq = 0;
    var _skipGeocode = false;
    var _state = { lat: null, lng: null, address: '' };
    var _onConfirm = null;
    var _slug = '';
    var _latInput = null;
    var _lngInput = null;
    var _addressInput = null;
    var _display = null;
    var _fieldBox = null;
    var _pendingGeo = null;

    function showMapError(msg) {
        var main = document.getElementById('apAddrMain');
        if (main) main.textContent = msg;
        var btn = document.getElementById('apConfirmBtn');
        if (btn) btn.disabled = true;
    }

    function applyGeoToMap(geo) {
        if (!_map || !geo) return Promise.resolve();
        _skipGeocode = true;
        _map.setView([geo.latitude, geo.longitude], GPS_ZOOM, { animate: true });
        pulsePin();
        return reverseGeocode(geo.latitude, geo.longitude).then(function () {
            if (window.GeoLocation && GeoLocation.shouldWarnApproximate(geo)) {
                var sub = document.getElementById('apAddrSub');
                if (sub) sub.textContent = GeoLocation.getApproximateWarning(lang());
            }
        });
    }

    function startGeoCapture() {
        if (!window.GeoLocation) return null;
        return GeoLocation.getCurrentPosition({ lang: lang() });
    }

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

    function storageKey(f) {
        return 'checkout:' + (_slug || 'default') + ':' + f;
    }

    function ensureOverlay() {
        if (_overlay) return;

        _overlay = document.createElement('div');
        _overlay.id = 'addressPickerOverlay';
        _overlay.className = 'ap-overlay';
        _overlay.innerHTML =
            '<div class="ap-topbar">' +
            '  <button type="button" class="ap-back" id="apBackBtn" aria-label="Артка">' +
            '    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>' +
            '  </button>' +
            '  <h1 class="ap-topbar-title" id="apTitle"></h1>' +
            '  <span class="ap-topbar-spacer"></span>' +
            '</div>' +
            '<div class="ap-map-area">' +
            '  <div id="apMap" class="ap-map"></div>' +
            '  <div class="ap-pin-layer" id="apPinLayer">' +
            '    <div class="ap-pin-shadow"></div>' +
            '    <div class="ap-pin">' +
            '      <svg viewBox="0 0 48 62" fill="none"><path d="M24 2C12 2 3 11 3 23c0 16 21 37 21 37s21-21 21-37C45 11 36 2 24 2z" fill="#22c55e" stroke="#fff" stroke-width="2.5"/><circle cx="24" cy="22" r="8" fill="#fff"/><circle cx="24" cy="22" r="4" fill="#22c55e"/></svg>' +
            '    </div>' +
            '  </div>' +
            '  <button type="button" class="ap-gps-btn" id="apGpsBtn" title="GPS">' +
            '    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#4285F4" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="#4285F4"/><line x1="12" y1="2" x2="12" y2="6" stroke="#4285F4" stroke-width="1.6"/><line x1="12" y1="18" x2="12" y2="22" stroke="#4285F4" stroke-width="1.6"/><line x1="2" y1="12" x2="6" y2="12" stroke="#4285F4" stroke-width="1.6"/><line x1="18" y1="12" x2="22" y2="12" stroke="#4285F4" stroke-width="1.6"/></svg>' +
            '  </button>' +
            '  <div class="ap-map-loader hidden" id="apMapLoader"><div class="ap-spinner"></div><span id="apLoaderText"></span></div>' +
            '</div>' +
            '<div class="ap-sheet">' +
            '  <div class="ap-addr-main" id="apAddrMain">&nbsp;</div>' +
            '  <div class="ap-addr-sub" id="apAddrSub">Бишкек, Кыргызстан</div>' +
            '  <button type="button" class="ap-confirm" id="apConfirmBtn"></button>' +
            '</div>';

        document.body.appendChild(_overlay);

        document.getElementById('apBackBtn').addEventListener('click', close);
        document.getElementById('apGpsBtn').addEventListener('click', locateOnMap);
        document.getElementById('apConfirmBtn').addEventListener('click', confirm);

        applyLabels();
    }

    function applyLabels() {
        var title = document.getElementById('apTitle');
        if (title) title.textContent = t('title');
        var btn = document.getElementById('apConfirmBtn');
        if (btn) btn.textContent = t('confirm');
    }

    function setMapLoading(on, text) {
        var el = document.getElementById('apMapLoader');
        var txt = document.getElementById('apLoaderText');
        if (el) el.classList.toggle('hidden', !on);
        if (txt) txt.textContent = text || t('locating');
        var gps = document.getElementById('apGpsBtn');
        if (gps) gps.disabled = !!on;
    }

    function pulsePin() {
        var layer = document.getElementById('apPinLayer');
        if (!layer) return;
        layer.classList.remove('ap-pulse');
        void layer.offsetWidth;
        layer.classList.add('ap-pulse');
        setTimeout(function () { layer.classList.remove('ap-pulse'); }, 900);
    }

    function initMap(center, zoom) {
        if (typeof L === 'undefined') return;
        var el = document.getElementById('apMap');
        if (!el) return;

        center = center || DEFAULT_CENTER;
        zoom = zoom || DEFAULT_ZOOM;

        if (_map) {
            _map.setView(center, zoom, { animate: false });
            setTimeout(function () { _map.invalidateSize(); }, 80);
            return;
        }

        _map = L.map(el, { center: center, zoom: zoom, zoomControl: false, attributionControl: false });

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            maxNativeZoom: 19
        }).addTo(_map);

        L.control.zoom({ position: 'bottomright' }).addTo(_map);

        _map.on('movestart', function () {
            document.getElementById('apPinLayer').classList.add('ap-lift');
        });
        _map.on('moveend', onMapStop);

        setTimeout(function () { _map.invalidateSize(); }, 100);
    }

    function onMapStop() {
        if (!_map) return;
        document.getElementById('apPinLayer').classList.remove('ap-lift');
        if (_skipGeocode) {
            _skipGeocode = false;
            return;
        }
        clearTimeout(_debounceGeo);
        _debounceGeo = setTimeout(function () {
            var c = _map.getCenter();
            _state.lat = c.lat;
            _state.lng = c.lng;
            reverseGeocode(c.lat, c.lng);
        }, 350);
    }

    function reverseGeocode(lat, lng) {
        var req = ++_geocodeReq;
        setMapLoading(true, t('geocoding'));

        return fetch('/api/geocode/reverse?lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lng) + '&lang=ru')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (req !== _geocodeReq) return;
                _state.lat = lat;
                _state.lng = lng;
                _state.address = (data && (data.address || data.fullAddress)) || (lat.toFixed(5) + ', ' + lng.toFixed(5));
                updateSheet(_state.address);
            })
            .catch(function () {
                if (req !== _geocodeReq) return;
                _state.lat = lat;
                _state.lng = lng;
                _state.address = lat.toFixed(5) + ', ' + lng.toFixed(5);
                updateSheet(_state.address);
            })
            .finally(function () {
                if (req === _geocodeReq) setMapLoading(false);
            });
    }

    function updateSheet(addr) {
        var main = document.getElementById('apAddrMain');
        var btn = document.getElementById('apConfirmBtn');
        if (main) main.textContent = addr || '\u00a0';
        if (btn) btn.disabled = !addr;
    }

    function locateOnMap() {
        if (!window.GeoLocation) {
            showMapError(t('pickOnMap'));
            return;
        }

        setMapLoading(true, t('locating'));
        startGeoCapture()
            .then(applyGeoToMap)
            .catch(function (err) {
                showMapError(err.message || t('pickOnMap'));
            })
            .finally(function () {
                setMapLoading(false);
            });
    }

    function open() {
        ensureOverlay();
        applyLabels();
        _overlay.classList.add('ap-open');
        document.body.style.overflow = 'hidden';

        var lat = _latInput && parseFloat(_latInput.value);
        var lng = _lngInput && parseFloat(_lngInput.value);
        var hasCoords = !isNaN(lat) && !isNaN(lng);

        _state.address = (_addressInput && _addressInput.value) || '';
        updateSheet(_state.address);

        if (hasCoords) {
            _pendingGeo = null;
        } else if (!_pendingGeo) {
            _pendingGeo = startGeoCapture();
        }

        setTimeout(function () {
            if (hasCoords) {
                initMap([lat, lng], GPS_ZOOM);
                reverseGeocode(lat, lng);
            } else {
                initMap(DEFAULT_CENTER, DEFAULT_ZOOM);
                setMapLoading(true, t('locating'));
                var geoPromise = _pendingGeo || startGeoCapture();
                geoPromise
                    .then(applyGeoToMap)
                    .catch(function (err) {
                        showMapError(err.message || t('pickOnMap'));
                    })
                    .finally(function () {
                        setMapLoading(false);
                        _pendingGeo = null;
                    });
            }
        }, 80);
    }

    function close() {
        if (_overlay) _overlay.classList.remove('ap-open');
        document.body.style.overflow = '';
        setMapLoading(false);
    }

    function confirm() {
        if (!_state.lat || !_state.address) return;

        if (_latInput) _latInput.value = String(_state.lat);
        if (_lngInput) _lngInput.value = String(_state.lng);
        if (_addressInput) _addressInput.value = _state.address;
        updateDisplay(_state.address);

        try {
            localStorage.setItem(storageKey('address'), _state.address);
            localStorage.setItem(storageKey('latitude'), String(_state.lat));
            localStorage.setItem(storageKey('longitude'), String(_state.lng));
        } catch (e) { /* ignore */ }

        if (_onConfirm) {
            _onConfirm({ address: _state.address, latitude: _state.lat, longitude: _state.lng });
        }
        close();
    }

    function updateDisplay(text) {
        if (_display) {
            _display.textContent = text || t('pickOnMapCheckout');
            _display.classList.toggle('ap-empty', !text);
        }
    }

    function ensureLocation() {
        var lat = _latInput && parseFloat(_latInput.value);
        var lng = _lngInput && parseFloat(_lngInput.value);
        var addr = (_addressInput && _addressInput.value.trim()) || '';
        if (addr.length >= 3 && !isNaN(lat) && !isNaN(lng)) {
            return Promise.resolve({ address: addr, latitude: lat, longitude: lng });
        }
        return Promise.reject(new Error(t('pickOnMap')));
    }

    function bindCheckout(options) {
        options = options || {};
        _slug = options.slug || window.restaurantSlug || (window.RESTAURANT && window.RESTAURANT.slug) || 'default';
        _onConfirm = options.onConfirm || null;

        _fieldBox = document.getElementById('addressFieldBox');
        _display = document.getElementById('addressDisplay');
        _latInput = document.getElementById('latitude');
        _lngInput = document.getElementById('longitude');
        _addressInput = document.getElementById('address');

        var saved = (_addressInput && _addressInput.value.trim()) || '';
        updateDisplay(saved);

        if (_fieldBox) {
            _fieldBox.addEventListener('click', function (e) {
                e.preventDefault();
                _pendingGeo = startGeoCapture();
                open();
            });
        }

        return { open: open, ensureLocation: ensureLocation, updateDisplay: updateDisplay };
    }

    function refreshI18n() {
        applyLabels();
        if (_display && (!_addressInput || !_addressInput.value)) {
            updateDisplay('');
        }
    }

    return {
        open: open,
        close: close,
        confirm: confirm,
        bindCheckout: bindCheckout,
        ensureLocation: ensureLocation,
        locateMe: locateOnMap,
        refreshI18n: refreshI18n,
        t: t
    };
})();

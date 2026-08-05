/**
 * AddressPicker — картадан дарек тандоо (жөнөкөй, кыргызча).
 */
window.AddressPicker = (function () {
    'use strict';

    var DEFAULT_CENTER = [42.8746, 74.5698];
    var DEFAULT_ZOOM = 17;
    var GPS_ZOOM = 18;

    var TEXT = {
        ky: {
            myLocation: 'Жайгашкан жерим',
            mapHint: 'Картаны сүйрөп, пин турган жерге жеткирүү дарегин тандаңыз',
            address: 'Дарегиңиз',
            addressLoading: 'Дарек аныкталууда…',
            selectOnMap: 'Картаны сүйрөңүз',
            apartment: 'Батир / подъезд (милдеттүү эмес)',
            apartmentPlaceholder: 'Мисалы: 12-батир',
            confirmAddress: 'Даяр ✓',
            lastAddress: 'Акыркы дарек',
            gpsOffHint: 'GPS өчүк. Телефондо геолокацияны күйгүзүңүз.',
            gpsDenied: 'Геолокацияга уруксат бериңиз же картаны сүйрөңүз.',
            selectOnMapCheckout: 'Даректи тандаңыз',
            errAddressPick: 'Алгач дарегиңизди картадан тандаңыз'
        },
        ru: {
            myLocation: 'Где я сейчас',
            mapHint: 'Двигайте карту — метка показывает адрес доставки',
            address: 'Ваш адрес',
            addressLoading: 'Определяем адрес…',
            selectOnMap: 'Двигайте карту',
            apartment: 'Квартира / подъезд (необязательно)',
            apartmentPlaceholder: 'Например: кв. 12',
            confirmAddress: 'Готово ✓',
            lastAddress: 'Прошлый адрес',
            gpsOffHint: 'GPS выключен. Включите геолокацию.',
            gpsDenied: 'Разрешите геолокацию или двигайте карту.',
            selectOnMapCheckout: 'Выберите адрес',
            errAddressPick: 'Сначала выберите адрес на карте'
        }
    };

    var _map = null;
    var _overlay = null;
    var _debounceTimer = null;
    var _geocodeRequestId = 0;
    var _state = { lat: null, lng: null, address: '', geocoding: false };
    var _onConfirm = null;
    var _slug = '';

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

    function getLastAddress() {
        try {
            var raw = localStorage.getItem(storageKey('lastAddress'));
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function saveLastAddress(data) {
        localStorage.setItem(storageKey('lastAddress'), JSON.stringify({
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            apartment: data.apartment || '',
            savedAt: Date.now()
        }));
    }

    function ensureOverlay() {
        if (_overlay) return;

        _overlay = document.createElement('div');
        _overlay.id = 'addressPickerOverlay';
        _overlay.className = 'ap-overlay';
        _overlay.innerHTML =
            '<div class="ap-map-wrap">' +
            '  <div class="ap-top">' +
            '    <button type="button" class="ap-back" onclick="AddressPicker.close()" aria-label="Артка">←</button>' +
            '  </div>' +
            '  <div id="apMapHint" class="ap-map-hint"></div>' +
            '  <div id="apGpsBanner" class="ap-gps-banner hidden"></div>' +
            '  <div id="apMap" class="ap-map"></div>' +
            '  <div class="ap-pin-zone">' +
            '    <div class="ap-pin-shadow"></div>' +
            '    <div class="ap-pin" id="apPin">' +
            '      <svg viewBox="0 0 48 56" fill="none"><path d="M24 2C13.5 2 5 10.5 5 21c0 14 19 33 19 33s19-19 19-33C43 10.5 34.5 2 24 2z" fill="#16a34a" stroke="#fff" stroke-width="2"/><circle cx="24" cy="21" r="7" fill="#fff"/></svg>' +
            '    </div>' +
            '  </div>' +
            '  <button type="button" class="ap-locate-fab" id="apLocateBtn" onclick="AddressPicker.locateMe()">' +
            '    <span>📍</span><span id="apLocateText"></span>' +
            '  </button>' +
            '  <div class="ap-zoom-btns">' +
            '    <button type="button" onclick="AddressPicker.zoomIn()" aria-label="+">+</button>' +
            '    <button type="button" onclick="AddressPicker.zoomOut()" aria-label="−">−</button>' +
            '  </div>' +
            '</div>' +
            '<div class="ap-sheet">' +
            '  <div class="ap-sheet-handle"></div>' +
            '  <div id="apLastAddr" class="hidden"></div>' +
            '  <div class="ap-address-box">' +
            '    <div class="ap-address-label" id="apAddressLabel"></div>' +
            '    <div class="ap-address-value" id="apAddressText"></div>' +
            '  </div>' +
            '  <input type="text" class="ap-field-input" id="apApartment" autocomplete="off">' +
            '  <button type="button" class="ap-confirm" id="apConfirmBtn" onclick="AddressPicker.confirm()" disabled></button>' +
            '</div>';

        document.body.appendChild(_overlay);
    }

    function applyLabels() {
        var hint = document.getElementById('apMapHint');
        if (hint) hint.textContent = t('mapHint');
        var locate = document.getElementById('apLocateText');
        if (locate) locate.textContent = t('myLocation');
        var label = document.getElementById('apAddressLabel');
        if (label) label.textContent = '📍 ' + t('address');
        var apt = document.getElementById('apApartment');
        if (apt) apt.placeholder = t('apartmentPlaceholder');
        var btn = document.getElementById('apConfirmBtn');
        if (btn) btn.textContent = t('confirmAddress');
    }

    function initMap(center, zoom) {
        if (typeof L === 'undefined') return;

        var mapEl = document.getElementById('apMap');
        if (!mapEl) return;

        if (_map) {
            _map.setView(center, zoom || DEFAULT_ZOOM, { animate: true });
            return;
        }

        _map = L.map(mapEl, {
            center: center,
            zoom: zoom || DEFAULT_ZOOM,
            zoomControl: false,
            attributionControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            subdomains: ['a', 'b', 'c']
        }).addTo(_map);

        _map.on('movestart', function () {
            var zone = document.querySelector('.ap-pin-zone');
            if (zone) zone.classList.add('ap-pin-lift');
        });

        _map.on('moveend', function () {
            var zone = document.querySelector('.ap-pin-zone');
            if (zone) zone.classList.remove('ap-pin-lift');
            onMapMoved();
        });

        setTimeout(function () { _map.invalidateSize(); }, 120);
    }

    function zoomIn() {
        if (_map) _map.zoomIn();
    }

    function zoomOut() {
        if (_map) _map.zoomOut();
    }

    function onMapMoved() {
        if (!_map) return;
        clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(function () {
            var center = _map.getCenter();
            _state.lat = center.lat;
            _state.lng = center.lng;
            reverseGeocode(center.lat, center.lng);
        }, 300);
    }

    function reverseGeocode(lat, lng) {
        var reqId = ++_geocodeRequestId;
        _state.geocoding = true;
        updateAddressDisplay(t('addressLoading'), true);
        document.getElementById('apConfirmBtn').disabled = true;

        var geoLang = lang() === 'ru' ? 'ru' : 'ru';

        fetch('/api/geocode/reverse?lat=' + lat + '&lon=' + lng + '&lang=' + geoLang)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (reqId !== _geocodeRequestId) return;
                _state.geocoding = false;
                _state.address = data.address || data.fullAddress || '';
                updateAddressDisplay(_state.address);
                document.getElementById('apConfirmBtn').disabled = !_state.address;
            })
            .catch(function () {
                if (reqId !== _geocodeRequestId) return;
                _state.geocoding = false;
                _state.address = lat.toFixed(5) + ', ' + lng.toFixed(5);
                updateAddressDisplay(_state.address);
                document.getElementById('apConfirmBtn').disabled = false;
            });
    }

    function updateAddressDisplay(text, loading) {
        var el = document.getElementById('apAddressText');
        if (!el) return;
        el.textContent = text || t('selectOnMap');
        el.classList.toggle('ap-loading', !!loading);
        el.classList.toggle('ap-empty', !text || text === t('selectOnMap') || text === t('addressLoading'));
    }

    function showGpsBanner(msg) {
        var banner = document.getElementById('apGpsBanner');
        if (!banner) return;
        banner.textContent = msg;
        banner.classList.remove('hidden');
    }

    function hideGpsBanner() {
        var banner = document.getElementById('apGpsBanner');
        if (banner) banner.classList.add('hidden');
    }

    function renderLastAddressChip() {
        var container = document.getElementById('apLastAddr');
        if (!container) return;
        var last = getLastAddress();
        if (!last || !last.address) {
            container.classList.add('hidden');
            container.innerHTML = '';
            return;
        }
        container.classList.remove('hidden');
        container.innerHTML =
            '<button type="button" class="ap-last-addr" onclick="AddressPicker.useLastAddress()">' +
            '<span>🕐</span><span><strong>' + t('lastAddress') + '</strong> — ' + escapeHtml(last.address) + '</span>' +
            '</button>';
    }

    function escapeHtml(v) {
        return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function locateMe() {
        if (!navigator.geolocation) {
            showGpsBanner(t('gpsOffHint'));
            return;
        }

        var btn = document.getElementById('apLocateBtn');
        if (btn) btn.classList.add('ap-loading');
        hideGpsBanner();

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                if (btn) btn.classList.remove('ap-loading');
                hideGpsBanner();
                if (_map) {
                    _map.setView([pos.coords.latitude, pos.coords.longitude], GPS_ZOOM, { animate: true });
                }
            },
            function (err) {
                if (btn) btn.classList.remove('ap-loading');
                showGpsBanner(err.code === 1 ? t('gpsDenied') : t('gpsOffHint'));
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
    }

    function useLastAddress() {
        var last = getLastAddress();
        if (!last || last.latitude == null) return;

        if (_map) {
            _map.setView([last.latitude, last.longitude], GPS_ZOOM, { animate: true });
        }

        _state.lat = last.latitude;
        _state.lng = last.longitude;
        _state.address = last.address;
        updateAddressDisplay(last.address);

        var apt = document.getElementById('apApartment');
        if (apt) apt.value = last.apartment || '';

        document.getElementById('apConfirmBtn').disabled = false;
    }

    function buildFullAddress() {
        var addr = _state.address || '';
        var apt = ((document.getElementById('apApartment') || {}).value || '').trim();
        if (apt && addr) return addr + ', ' + apt;
        if (apt) return apt;
        return addr;
    }

    function confirm() {
        if (!_state.address || _state.lat == null) return;

        var apartment = ((document.getElementById('apApartment') || {}).value || '').trim();
        var result = {
            address: buildFullAddress(),
            streetAddress: _state.address,
            latitude: _state.lat,
            longitude: _state.lng,
            apartment: apartment,
            comment: ''
        };

        saveLastAddress(result);
        if (_onConfirm) _onConfirm(result);
        close();
    }

    function open(options) {
        options = options || {};
        _slug = options.slug || window.restaurantSlug || (window.RESTAURANT && window.RESTAURANT.slug) || 'default';
        _onConfirm = options.onConfirm || null;

        ensureOverlay();
        applyLabels();
        renderLastAddressChip();
        hideGpsBanner();

        var aptEl = document.getElementById('apApartment');
        if (aptEl) aptEl.value = options.apartment || '';

        _overlay.classList.add('ap-open');
        document.body.style.overflow = 'hidden';

        var startCenter = DEFAULT_CENTER;
        var startZoom = DEFAULT_ZOOM;

        if (options.latitude != null && options.longitude != null) {
            startCenter = [options.latitude, options.longitude];
            startZoom = GPS_ZOOM;
            _state.lat = options.latitude;
            _state.lng = options.longitude;
            _state.address = options.address || '';
            if (_state.address) {
                updateAddressDisplay(_state.address);
                document.getElementById('apConfirmBtn').disabled = false;
            }
        } else {
            _state.address = '';
            updateAddressDisplay(t('selectOnMap'));
            document.getElementById('apConfirmBtn').disabled = true;
        }

        setTimeout(function () {
            initMap(startCenter, startZoom);
            if (!options.address && options.latitude == null) onMapMoved();
            if (options.autoLocate !== false && options.latitude == null) locateMe();
        }, 60);
    }

    function close() {
        if (_overlay) _overlay.classList.remove('ap-open');
        document.body.style.overflow = '';
    }

    function bindCheckout(options) {
        options = options || {};
        var slug = options.slug || window.restaurantSlug || (window.RESTAURANT && window.RESTAURANT.slug) || 'default';
        _slug = slug;

        var fieldBox = document.getElementById('addressFieldBox');
        var display = document.getElementById('addressDisplay');
        var latInput = document.getElementById('latitude');
        var lngInput = document.getElementById('longitude');
        var addressInput = document.getElementById('address');
        var lastChip = document.getElementById('lastAddressChip');

        function updateDisplay(text) {
            var label = text || t('selectOnMapCheckout');
            if (display) {
                display.textContent = label;
                display.classList.toggle('ap-empty', !text);
            }
            if (addressInput) addressInput.value = text || '';
        }

        function applyResult(result) {
            updateDisplay(result.address);
            if (latInput) latInput.value = result.latitude;
            if (lngInput) lngInput.value = result.longitude;
            renderCheckoutLastChip();
        }

        function openPicker() {
            open({
                slug: slug,
                address: addressInput ? addressInput.value : '',
                latitude: latInput && latInput.value ? parseFloat(latInput.value) : null,
                longitude: lngInput && lngInput.value ? parseFloat(lngInput.value) : null,
                apartment: '',
                autoLocate: !latInput || !latInput.value,
                onConfirm: applyResult
            });
        }

        if (fieldBox) fieldBox.addEventListener('click', function () { openPicker(); });
        if (display) display.addEventListener('click', openPicker);

        function renderCheckoutLastChip() {
            if (!lastChip) return;
            var last = getLastAddress();
            if (!last || !last.address || (addressInput && addressInput.value)) {
                lastChip.classList.add('hidden');
                return;
            }
            lastChip.classList.remove('hidden');
            lastChip.textContent = '🕐 ' + t('lastAddress') + ': ' + last.address;
            lastChip.onclick = function () {
                applyResult({
                    address: last.apartment ? last.address + ', ' + last.apartment : last.address,
                    latitude: last.latitude,
                    longitude: last.longitude
                });
            };
        }

        renderCheckoutLastChip();

        if (options.autoOpen && (!latInput || !latInput.value)) {
            setTimeout(openPicker, 300);
        }

        return { open: openPicker, updateDisplay: updateDisplay };
    }

    function refreshI18n() {
        applyLabels();
    }

    return {
        open: open,
        close: close,
        confirm: confirm,
        locateMe: locateMe,
        useLastAddress: useLastAddress,
        bindCheckout: bindCheckout,
        getLastAddress: getLastAddress,
        refreshI18n: refreshI18n,
        zoomIn: zoomIn,
        zoomOut: zoomOut,
        t: t
    };
})();

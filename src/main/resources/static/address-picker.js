/**
 * AddressPicker — картадан дарек тандоо (Yandex Go / 2GIS стилinde).
 * Leaflet + fixed center pin + reverse geocoding.
 */
window.AddressPicker = (function () {
    'use strict';

    var DEFAULT_CENTER = [42.8746, 74.5698];
    var DEFAULT_ZOOM = 16;
    var GPS_ZOOM = 17;

    var _map = null;
    var _overlay = null;
    var _debounceTimer = null;
    var _geocodeRequestId = 0;
    var _state = {
        lat: null,
        lng: null,
        address: '',
        apartment: '',
        comment: '',
        geocoding: false
    };
    var _onConfirm = null;
    var _slug = '';

    function t(key, params) {
        if (window.CustomerI18n && CustomerI18n.t) {
            return CustomerI18n.t(key, params);
        }
        var fallbacks = {
            addressPickTitle: 'Дарек',
            myLocation: 'Жайгашкан жерим',
            lastAddress: 'Акыркы дарек',
            addressLoading: 'Дарек аныкталууда…',
            apartment: 'Батир / Подъезд',
            apartmentPlaceholder: 'Мисалы: 12, 3-подъезд',
            courierComment: 'Курьерге комментарий',
            courierCommentPlaceholder: 'Мисалы: кызыл дарбаза',
            confirmAddress: 'Даректи тастыктоо',
            gpsOffHint: 'GPS өчүк. Телефондо геолокацияны күйгүзүңүз же картаны сүйрөп дарек тандаңыз.',
            gpsDenied: 'Геолокацияга уруксат берилген жок. Картаны сүйрөп дарек тандаңыз.',
            selectOnMap: 'Картадан даректи тандаңыз',
            errAddressPick: 'Дарегиңизди картадан тандаңыз'
        };
        return fallbacks[key] || key;
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
            comment: data.comment || '',
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
            '    <button type="button" class="ap-back" onclick="AddressPicker.close()" aria-label="Жабуу">←</button>' +
            '    <button type="button" class="ap-locate" id="apLocateBtn" onclick="AddressPicker.locateMe()">' +
            '      <span>📍</span><span id="apLocateText">' + t('myLocation') + '</span>' +
            '    </button>' +
            '  </div>' +
            '  <div id="apGpsBanner" class="ap-gps-banner hidden"></div>' +
            '  <div id="apMap" class="ap-map"></div>' +
            '  <div class="ap-pin" id="apPin">' +
            '    <svg viewBox="0 0 44 52" fill="none"><path d="M22 0C11.5 0 3 8.5 3 19c0 13.5 19 33 19 33s19-19.5 19-33C41 8.5 32.5 0 22 0z" fill="#22c55e"/><circle cx="22" cy="19" r="8" fill="#fff"/></svg>' +
            '  </div>' +
            '</div>' +
            '<div class="ap-sheet">' +
            '  <div class="ap-sheet-handle"></div>' +
            '  <div id="apLastAddr" class="hidden"></div>' +
            '  <div class="ap-field">' +
            '    <div class="ap-field-label">📍 ' + t('addressPickTitle') + '</div>' +
            '    <div class="ap-field-value" id="apAddressText">' + t('selectOnMap') + '</div>' +
            '  </div>' +
            '  <div class="ap-field">' +
            '    <div class="ap-field-label">' + t('apartment') + '</div>' +
            '    <input type="text" class="ap-field-input" id="apApartment" placeholder="' + t('apartmentPlaceholder') + '">' +
            '  </div>' +
            '  <div class="ap-field">' +
            '    <div class="ap-field-label">' + t('courierComment') + '</div>' +
            '    <input type="text" class="ap-field-input" id="apComment" placeholder="' + t('courierCommentPlaceholder') + '">' +
            '  </div>' +
            '  <button type="button" class="ap-confirm" id="apConfirmBtn" onclick="AddressPicker.confirm()" disabled>' +
            t('confirmAddress') +
            '</button>' +
            '</div>';

        document.body.appendChild(_overlay);
    }

    function initMap(center, zoom) {
        if (typeof L === 'undefined') {
            console.error('Leaflet not loaded');
            return;
        }

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

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(_map);

        _map.on('movestart', function () {
            var pin = document.getElementById('apPin');
            if (pin) pin.classList.add('ap-pin-drop');
        });

        _map.on('moveend', function () {
            var pin = document.getElementById('apPin');
            if (pin) pin.classList.remove('ap-pin-drop');
            onMapMoved();
        });

        setTimeout(function () { _map.invalidateSize(); }, 100);
    }

    function onMapMoved() {
        if (!_map) return;
        clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(function () {
            var center = _map.getCenter();
            _state.lat = center.lat;
            _state.lng = center.lng;
            reverseGeocode(center.lat, center.lng);
        }, 350);
    }

    function reverseGeocode(lat, lng) {
        var reqId = ++_geocodeRequestId;
        _state.geocoding = true;
        updateAddressDisplay(t('addressLoading'), true);
        document.getElementById('apConfirmBtn').disabled = true;

        var lang = (window.CustomerI18n && CustomerI18n.getLang) ? CustomerI18n.getLang() : 'ru';

        fetch('/api/geocode/reverse?lat=' + lat + '&lon=' + lng + '&lang=' + lang)
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
        el.classList.toggle('ap-loading-text', !!loading);
        el.classList.toggle('ap-address-empty', !text || text === t('selectOnMap'));
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
            '<span class="ap-last-addr-icon">🕐</span>' +
            '<span class="ap-last-addr-body">' +
            '<div class="ap-last-addr-label">' + t('lastAddress') + '</div>' +
            '<div class="ap-last-addr-text">' + escapeHtml(last.address) + '</div>' +
            '</span></button>';
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
                var lat = pos.coords.latitude;
                var lng = pos.coords.longitude;
                if (_map) {
                    _map.setView([lat, lng], GPS_ZOOM, { animate: true });
                }
            },
            function (err) {
                if (btn) btn.classList.remove('ap-loading');
                if (err.code === 1) {
                    showGpsBanner(t('gpsDenied'));
                } else {
                    showGpsBanner(t('gpsOffHint'));
                }
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
        var cmt = document.getElementById('apComment');
        if (apt) apt.value = last.apartment || '';
        if (cmt) cmt.value = last.comment || '';

        document.getElementById('apConfirmBtn').disabled = false;
    }

    function buildFullAddress() {
        var addr = _state.address || '';
        var apt = (document.getElementById('apApartment') || {}).value || '';
        apt = apt.trim();
        if (apt && addr) return addr + ', ' + apt;
        if (apt) return apt;
        return addr;
    }

    function confirm() {
        if (!_state.address || _state.lat == null) return;

        var apartment = ((document.getElementById('apApartment') || {}).value || '').trim();
        var comment = ((document.getElementById('apComment') || {}).value || '').trim();
        var fullAddress = buildFullAddress();

        var result = {
            address: fullAddress,
            streetAddress: _state.address,
            latitude: _state.lat,
            longitude: _state.lng,
            apartment: apartment,
            comment: comment
        };

        saveLastAddress(result);

        if (_onConfirm) _onConfirm(result);

        close();
    }

    function open(options) {
        options = options || {};
        _slug = options.slug || (window.restaurantSlug) || (window.RESTAURANT && window.RESTAURANT.slug) || 'default';
        _onConfirm = options.onConfirm || null;

        ensureOverlay();
        renderLastAddressChip();
        hideGpsBanner();

        var aptEl = document.getElementById('apApartment');
        var cmtEl = document.getElementById('apComment');
        if (aptEl) aptEl.value = options.apartment || '';
        if (cmtEl) cmtEl.value = options.comment || '';

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
            if (!options.address && options.latitude == null) {
                onMapMoved();
            }
            if (options.autoLocate !== false && options.latitude == null) {
                locateMe();
            }
        }, 50);
    }

    function close() {
        if (_overlay) _overlay.classList.remove('ap-open');
        document.body.style.overflow = '';
    }

    function bindCheckout(options) {
        options = options || {};
        var slug = options.slug || (window.restaurantSlug) || (window.RESTAURANT && window.RESTAURANT.slug) || 'default';
        _slug = slug;

        var fieldBox = document.getElementById('addressFieldBox');
        var display = document.getElementById('addressDisplay');
        var latInput = document.getElementById('latitude');
        var lngInput = document.getElementById('longitude');
        var addressInput = document.getElementById('address');
        var commentInput = document.getElementById('comment');
        var lastChip = document.getElementById('lastAddressChip');

        function updateDisplay(text) {
            if (display) {
                display.textContent = text || t('selectOnMap');
                display.classList.toggle('ap-empty', !text);
            }
            if (addressInput) addressInput.value = text || '';
        }

        function applyResult(result) {
            updateDisplay(result.address);
            if (latInput) latInput.value = result.latitude;
            if (lngInput) lngInput.value = result.longitude;
            if (commentInput && result.comment) {
                commentInput.value = result.comment;
            }
            renderCheckoutLastChip();
        }

        function openPicker() {
            open({
                slug: slug,
                address: addressInput ? addressInput.value : '',
                latitude: latInput && latInput.value ? parseFloat(latInput.value) : null,
                longitude: lngInput && lngInput.value ? parseFloat(lngInput.value) : null,
                apartment: '',
                comment: commentInput ? commentInput.value : '',
                autoLocate: !latInput || !latInput.value,
                onConfirm: applyResult
            });
        }

        if (fieldBox) {
            fieldBox.addEventListener('click', function (e) {
                if (e.target.tagName === 'INPUT') return;
                openPicker();
            });
        }
        if (display) display.addEventListener('click', openPicker);

        function renderCheckoutLastChip() {
            if (!lastChip) return;
            var last = getLastAddress();
            if (!last || !last.address) {
                lastChip.classList.add('hidden');
                return;
            }
            if (addressInput && addressInput.value) {
                lastChip.classList.add('hidden');
                return;
            }
            lastChip.classList.remove('hidden');
            lastChip.innerHTML = '🕐 ' + t('lastAddress') + ': ' + escapeHtml(last.address);
            lastChip.onclick = function () {
                applyResult({
                    address: last.apartment ? last.address + ', ' + last.apartment : last.address,
                    latitude: last.latitude,
                    longitude: last.longitude,
                    comment: last.comment || ''
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
        var locateText = document.getElementById('apLocateText');
        if (locateText) locateText.textContent = t('myLocation');
        var confirmBtn = document.getElementById('apConfirmBtn');
        if (confirmBtn) confirmBtn.textContent = t('confirmAddress');
    }

    return {
        open: open,
        close: close,
        confirm: confirm,
        locateMe: locateMe,
        useLastAddress: useLastAddress,
        bindCheckout: bindCheckout,
        getLastAddress: getLastAddress,
        saveLastAddress: saveLastAddress,
        refreshI18n: refreshI18n,
        t: t
    };
})();

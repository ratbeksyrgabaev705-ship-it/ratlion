/**
 * AddressPicker — Google Maps стилinde минималисттик дарек тандоо.
 */
window.AddressPicker = (function () {
    'use strict';

    var DEFAULT_CENTER = [42.8746, 74.5698];
    var DEFAULT_ZOOM = 17;
    var GPS_ZOOM = 18;
    var SHEET_COLLAPSED = 132;

    var TEXT = {
        ky: {
            myLocation: 'Менин жайгашкан жерим',
            confirmAddress: 'Бул даректи тандоо',
            selectOnMapCheckout: 'Даректи тандаңыз',
            errAddressPick: 'Алгач дарегиңизди картадан тандаңыз',
            gpsOffHint: 'GPS күйгүзүңүз',
            gpsDenied: 'Геолокацияга уруксат бериңиз'
        },
        ru: {
            myLocation: 'Моё местоположение',
            confirmAddress: 'Выбрать этот адрес',
            selectOnMapCheckout: 'Выберите адрес',
            errAddressPick: 'Сначала выберите адрес на карте',
            gpsOffHint: 'Включите GPS',
            gpsDenied: 'Разрешите геолокацию'
        }
    };

    var _map = null;
    var _overlay = null;
    var _debounceTimer = null;
    var _geocodeRequestId = 0;
    var _state = { lat: null, lng: null, address: '' };
    var _onConfirm = null;
    var _slug = '';
    var _sheetExpanded = false;
    var _dragStartY = 0;
    var _dragStartH = 0;

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

    function saveLastAddress(data) {
        localStorage.setItem(storageKey('lastAddress'), JSON.stringify({
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            savedAt: Date.now()
        }));
    }

    function ensureOverlay() {
        if (_overlay) return;

        _overlay = document.createElement('div');
        _overlay.id = 'addressPickerOverlay';
        _overlay.className = 'ap-overlay';
        _overlay.innerHTML =
            '<div class="ap-map-area">' +
            '  <button type="button" class="ap-back" onclick="AddressPicker.close()" aria-label="Артка">' +
            '    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>' +
            '  </button>' +
            '  <div id="apMap" class="ap-map"></div>' +
            '  <div class="ap-pin-layer">' +
            '    <div class="ap-pin-shadow"></div>' +
            '    <div class="ap-pin" id="apPin">' +
            '      <svg viewBox="0 0 36 48" fill="none"><path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="#EA4335"/><circle cx="18" cy="18" r="7" fill="#fff"/><circle cx="18" cy="18" r="3.5" fill="#EA4335"/></svg>' +
            '    </div>' +
            '  </div>' +
            '  <button type="button" class="ap-locate" id="apLocateBtn" onclick="AddressPicker.locateMe()">' +
            '    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4285F4" stroke-width="2.2"><circle cx="12" cy="12" r="3" fill="#4285F4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>' +
            '    <span id="apLocateText"></span>' +
            '  </button>' +
            '  <div class="ap-zoom">' +
            '    <button type="button" onclick="AddressPicker.zoomIn()">+</button>' +
            '    <button type="button" onclick="AddressPicker.zoomOut()">−</button>' +
            '  </div>' +
            '  <div id="apGpsToast" class="ap-gps-toast hidden"></div>' +
            '</div>' +
            '<div class="ap-sheet" id="apSheet">' +
            '  <div class="ap-sheet-grab" id="apSheetGrab"></div>' +
            '  <div class="ap-sheet-body">' +
            '    <div class="ap-addr" id="apAddressText"></div>' +
            '    <button type="button" class="ap-confirm" id="apConfirmBtn" onclick="AddressPicker.confirm()" disabled></button>' +
            '  </div>' +
            '</div>';

        document.body.appendChild(_overlay);
        initSheetDrag();
    }

    function applyLabels() {
        var btn = document.getElementById('apConfirmBtn');
        if (btn) btn.textContent = t('confirmAddress');
        var locText = document.getElementById('apLocateText');
        if (locText) locText.textContent = t('myLocation');
    }

    function initSheetDrag() {
        var grab = document.getElementById('apSheetGrab');
        var sheet = document.getElementById('apSheet');
        if (!grab || !sheet) return;

        function onStart(clientY) {
            _dragStartY = clientY;
            _dragStartH = sheet.offsetHeight;
            sheet.classList.add('ap-sheet-dragging');
        }

        function onMove(clientY) {
            var dy = _dragStartY - clientY;
            var h = Math.min(window.innerHeight * 0.45, Math.max(SHEET_COLLAPSED, _dragStartH + dy));
            sheet.style.height = h + 'px';
        }

        function onEnd() {
            var sheetEl = document.getElementById('apSheet');
            if (!sheetEl) return;
            sheetEl.classList.remove('ap-sheet-dragging');
            var h = sheetEl.offsetHeight;
            _sheetExpanded = h > SHEET_COLLAPSED + 40;
            sheetEl.style.height = '';
            sheetEl.classList.toggle('ap-sheet-expanded', _sheetExpanded);
        }

        grab.addEventListener('touchstart', function (e) {
            onStart(e.touches[0].clientY);
        }, { passive: true });
        grab.addEventListener('touchmove', function (e) {
            onMove(e.touches[0].clientY);
        }, { passive: true });
        grab.addEventListener('touchend', onEnd);

        grab.addEventListener('mousedown', function (e) {
            onStart(e.clientY);
            function mm(ev) { onMove(ev.clientY); }
            function mu() {
                onEnd();
                document.removeEventListener('mousemove', mm);
                document.removeEventListener('mouseup', mu);
            }
            document.addEventListener('mousemove', mm);
            document.addEventListener('mouseup', mu);
        });

        grab.addEventListener('click', function () {
            _sheetExpanded = !_sheetExpanded;
            sheet.classList.toggle('ap-sheet-expanded', _sheetExpanded);
        });
    }

    function initMap(center, zoom) {
        if (typeof L === 'undefined') return;
        var mapEl = document.getElementById('apMap');
        if (!mapEl) return;

        if (_map) {
            _map.setView(center, zoom || DEFAULT_ZOOM, { animate: true });
            setTimeout(function () { _map.invalidateSize(); }, 80);
            return;
        }

        _map = L.map(mapEl, {
            center: center,
            zoom: zoom || DEFAULT_ZOOM,
            zoomControl: false,
            attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            subdomains: 'abcd'
        }).addTo(_map);

        _map.on('movestart', function () {
            var layer = document.querySelector('.ap-pin-layer');
            if (layer) layer.classList.add('ap-pin-lift');
            var el = document.getElementById('apAddressText');
            if (el) el.classList.add('ap-addr-dim');
        });

        _map.on('moveend', function () {
            var layer = document.querySelector('.ap-pin-layer');
            if (layer) layer.classList.remove('ap-pin-lift');
            onMapMoved();
        });

        setTimeout(function () { _map.invalidateSize(); }, 100);
    }

    function zoomIn() { if (_map) _map.zoomIn(); }
    function zoomOut() { if (_map) _map.zoomOut(); }

    function onMapMoved() {
        if (!_map) return;
        clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(function () {
            var c = _map.getCenter();
            _state.lat = c.lat;
            _state.lng = c.lng;
            reverseGeocode(c.lat, c.lng);
        }, 280);
    }

    function reverseGeocode(lat, lng) {
        var reqId = ++_geocodeRequestId;
        document.getElementById('apConfirmBtn').disabled = true;

        fetch('/api/geocode/reverse?lat=' + lat + '&lon=' + lng + '&lang=ru')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (reqId !== _geocodeRequestId) return;
                _state.address = data.address || data.fullAddress || '';
                updateAddressDisplay(_state.address);
                document.getElementById('apConfirmBtn').disabled = !_state.address;
            })
            .catch(function () {
                if (reqId !== _geocodeRequestId) return;
                _state.address = lat.toFixed(5) + ', ' + lng.toFixed(5);
                updateAddressDisplay(_state.address);
                document.getElementById('apConfirmBtn').disabled = false;
            });
    }

    function updateAddressDisplay(text) {
        var el = document.getElementById('apAddressText');
        if (!el) return;
        el.textContent = text || '\u00a0';
        el.classList.remove('ap-addr-dim');
        el.classList.toggle('ap-addr-empty', !text);
    }

    function showGpsToast(msg) {
        var t = document.getElementById('apGpsToast');
        if (!t) return;
        t.textContent = msg;
        t.classList.remove('hidden');
        clearTimeout(showGpsToast._tm);
        showGpsToast._tm = setTimeout(function () { t.classList.add('hidden'); }, 3500);
    }

    function locateMe() {
        if (!navigator.geolocation) {
            showGpsToast(t('gpsOffHint'));
            return;
        }
        var btn = document.getElementById('apLocateBtn');
        if (btn) btn.classList.add('ap-loading');

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                if (btn) btn.classList.remove('ap-loading');
                if (_map) {
                    _map.setView([pos.coords.latitude, pos.coords.longitude], GPS_ZOOM, { animate: true });
                }
            },
            function (err) {
                if (btn) btn.classList.remove('ap-loading');
                showGpsToast(err.code === 1 ? t('gpsDenied') : t('gpsOffHint'));
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
    }

    function confirm() {
        if (!_state.address || _state.lat == null) return;
        var result = {
            address: _state.address,
            latitude: _state.lat,
            longitude: _state.lng
        };
        saveLastAddress(result);
        if (_onConfirm) _onConfirm(result);
        close();
    }

    function open(options) {
        options = options || {};
        _slug = options.slug || window.restaurantSlug || (window.RESTAURANT && window.RESTAURANT.slug) || 'default';
        _onConfirm = options.onConfirm || null;
        _sheetExpanded = false;

        ensureOverlay();
        applyLabels();

        var sheet = document.getElementById('apSheet');
        if (sheet) {
            sheet.classList.remove('ap-sheet-expanded');
            sheet.style.height = '';
        }

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
            updateAddressDisplay(_state.address);
            document.getElementById('apConfirmBtn').disabled = !_state.address;
        } else {
            _state.address = '';
            updateAddressDisplay('');
            document.getElementById('apConfirmBtn').disabled = true;
        }

        setTimeout(function () {
            initMap(startCenter, startZoom);
            if (options.latitude == null) {
                locateMe();
            } else if (!_state.address) {
                onMapMoved();
            }
        }, 50);
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

        function updateDisplay(text) {
            if (display) {
                display.textContent = text || t('selectOnMapCheckout');
                display.classList.toggle('ap-empty', !text);
            }
            if (addressInput) addressInput.value = text || '';
        }

        function openPicker() {
            open({
                slug: slug,
                address: addressInput ? addressInput.value : '',
                latitude: latInput && latInput.value ? parseFloat(latInput.value) : null,
                longitude: lngInput && lngInput.value ? parseFloat(lngInput.value) : null,
                onConfirm: function (result) {
                    updateDisplay(result.address);
                    if (latInput) latInput.value = result.latitude;
                    if (lngInput) lngInput.value = result.longitude;
                }
            });
        }

        if (fieldBox) fieldBox.addEventListener('click', openPicker);
        if (display) display.addEventListener('click', openPicker);

        if (options.autoOpen && (!latInput || !latInput.value)) {
            setTimeout(openPicker, 300);
        }

        return { open: openPicker, updateDisplay: updateDisplay };
    }

    function refreshI18n() { applyLabels(); }

    return {
        open: open,
        close: close,
        confirm: confirm,
        locateMe: locateMe,
        bindCheckout: bindCheckout,
        refreshI18n: refreshI18n,
        zoomIn: zoomIn,
        zoomOut: zoomOut,
        t: t
    };
})();

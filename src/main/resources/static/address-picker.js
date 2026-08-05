/**
 * AddressPicker — Google / Yandex Maps деңгээлinde дарек тандоо.
 * GPS · издөө · карта синхрондуу.
 */
window.AddressPicker = (function () {
    'use strict';

    var DEFAULT_CENTER = [42.8746, 74.5698];
    var DEFAULT_ZOOM = 16;
    var GPS_ZOOM = 18;

    var TEXT = {
        ky: {
            searchPlaceholder: 'Даректи жазыңыз...',
            myLocation: 'Менин жайгашкан жерим',
            confirmAddress: 'Бул даректи тандоо',
            selectOnMapCheckout: 'Даректи тандаңыз',
            errAddressPick: 'Алгач дарегиңизди тандаңыз',
            gpsOff: 'GPS күйгүзүңүз',
            gpsDenied: 'Геолокацияга уруксат бериңиз'
        },
        ru: {
            searchPlaceholder: 'Введите адрес...',
            myLocation: 'Моё местоположение',
            confirmAddress: 'Выбрать этот адрес',
            selectOnMapCheckout: 'Выберите адрес',
            errAddressPick: 'Сначала выберите адрес',
            gpsOff: 'Включите GPS',
            gpsDenied: 'Разрешите геолокацию'
        }
    };

    var _map = null;
    var _overlay = null;
    var _debounceGeo = null;
    var _debounceSearch = null;
    var _geocodeReq = 0;
    var _searchReq = 0;
    var _skipGeocode = false;
    var _searchFocused = false;
    var _state = { lat: null, lng: null, address: '' };
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

    function storageKey(f) {
        return 'checkout:' + (_slug || 'default') + ':' + f;
    }

    function saveLastAddress(data) {
        localStorage.setItem(storageKey('lastAddress'), JSON.stringify({
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            savedAt: Date.now()
        }));
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function ensureOverlay() {
        if (_overlay) return;

        _overlay = document.createElement('div');
        _overlay.id = 'addressPickerOverlay';
        _overlay.className = 'ap-overlay';
        _overlay.innerHTML =
            '<header class="ap-header">' +
            '  <button type="button" class="ap-back" onclick="AddressPicker.close()" aria-label="Артка">' +
            '    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>' +
            '  </button>' +
            '  <div class="ap-search-wrap">' +
            '    <svg class="ap-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>' +
            '    <input type="search" id="apSearchInput" class="ap-search-input" autocomplete="off" enterkeyhint="search">' +
            '    <div id="apSuggestions" class="ap-suggestions hidden"></div>' +
            '  </div>' +
            '</header>' +
            '<div class="ap-map-area">' +
            '  <div id="apMap" class="ap-map"></div>' +
            '  <div class="ap-pin-layer" id="apPinLayer">' +
            '    <div class="ap-pin-shadow"></div>' +
            '    <div class="ap-pin">' +
            '      <svg viewBox="0 0 40 52" fill="none"><path d="M20 0C9.5 0 1 8.5 1 19c0 14 19 33 19 33s19-19 19-33C39 8.5 30.5 0 20 0z" fill="#22c55e" stroke="#fff" stroke-width="2"/><circle cx="20" cy="19" r="7" fill="#fff"/></svg>' +
            '    </div>' +
            '  </div>' +
            '  <div class="ap-controls">' +
            '    <button type="button" class="ap-ctrl ap-locate" id="apLocateBtn" onclick="AddressPicker.locateMe()">' +
            '      <span class="ap-locate-icon">◎</span>' +
            '      <span id="apLocateText"></span>' +
            '    </button>' +
            '    <div class="ap-zoom">' +
            '      <button type="button" onclick="AddressPicker.zoomIn()">+</button>' +
            '      <button type="button" onclick="AddressPicker.zoomOut()">−</button>' +
            '    </div>' +
            '  </div>' +
            '  <div id="apGpsToast" class="ap-toast hidden"></div>' +
            '</div>' +
            '<div class="ap-sheet" id="apSheet">' +
            '  <div class="ap-sheet-grab" id="apSheetGrab"></div>' +
            '  <div class="ap-sheet-addr" id="apAddressText">&nbsp;</div>' +
            '  <button type="button" class="ap-confirm" id="apConfirmBtn" onclick="AddressPicker.confirm()" disabled></button>' +
            '</div>';

        document.body.appendChild(_overlay);
        bindSearch();
        bindSheetDrag();
    }

    function applyLabels() {
        var inp = document.getElementById('apSearchInput');
        if (inp) inp.placeholder = t('searchPlaceholder');
        var loc = document.getElementById('apLocateText');
        if (loc) loc.textContent = t('myLocation');
        var btn = document.getElementById('apConfirmBtn');
        if (btn) btn.textContent = t('confirmAddress');
    }

    function bindSearch() {
        var input = document.getElementById('apSearchInput');
        if (!input) return;

        input.addEventListener('focus', function () {
            _searchFocused = true;
            if (input.value.trim().length >= 2) runSearch(input.value.trim());
        });
        input.addEventListener('blur', function () {
            setTimeout(function () {
                _searchFocused = false;
                hideSuggestions();
            }, 180);
        });
        input.addEventListener('input', function () {
            var q = input.value.trim();
            clearTimeout(_debounceSearch);
            if (q.length < 2) {
                hideSuggestions();
                return;
            }
            _debounceSearch = setTimeout(function () { runSearch(q); }, 320);
        });
    }

    function runSearch(q) {
        var req = ++_searchReq;
        fetch('/api/geocode/search?q=' + encodeURIComponent(q) + '&lang=ru')
            .then(function (r) { return r.json(); })
            .then(function (list) {
                if (req !== _searchReq || !_searchFocused) return;
                renderSuggestions(list || []);
            })
            .catch(function () { hideSuggestions(); });
    }

    function renderSuggestions(list) {
        var box = document.getElementById('apSuggestions');
        if (!box) return;
        if (!list.length) {
            box.classList.add('hidden');
            box.innerHTML = '';
            return;
        }
        box.innerHTML = list.map(function (item, i) {
            return '<button type="button" class="ap-sug-item" data-i="' + i + '">' +
                '<span class="ap-sug-pin">📍</span>' +
                '<span class="ap-sug-text">' + esc(item.label || item.address) + '</span></button>';
        }).join('');
        box.classList.remove('hidden');
        box._items = list;
        box.querySelectorAll('.ap-sug-item').forEach(function (el) {
            el.addEventListener('mousedown', function (e) {
                e.preventDefault();
                var idx = parseInt(el.getAttribute('data-i'), 10);
                selectSearchResult(box._items[idx]);
            });
        });
    }

    function hideSuggestions() {
        var box = document.getElementById('apSuggestions');
        if (box) {
            box.classList.add('hidden');
            box.innerHTML = '';
        }
    }

    function selectSearchResult(item) {
        if (!item) return;
        hideSuggestions();
        _searchFocused = false;
        var input = document.getElementById('apSearchInput');
        if (input) {
            input.value = item.address || item.label || '';
            input.blur();
        }
        setLocation(parseFloat(item.lat), parseFloat(item.lng), item.address || item.label, {
            zoom: GPS_ZOOM,
            skipGeocode: true
        });
    }

    /** Бардыk каналдар үчүн бир синхрон точка */
    function setLocation(lat, lng, address, opts) {
        opts = opts || {};
        _state.lat = lat;
        _state.lng = lng;
        if (address) _state.address = address;

        updateSheet(address || _state.address);
        setConfirmEnabled(!!(address || _state.address));

        if (!_searchFocused) {
            var input = document.getElementById('apSearchInput');
            if (input && address) input.value = address;
        }

        if (_map) {
            _skipGeocode = !!opts.skipGeocode;
            _map.setView([lat, lng], opts.zoom || _map.getZoom() || GPS_ZOOM, { animate: true });
        }

        if (!opts.skipGeocode) {
            reverseGeocode(lat, lng);
        }
    }

    function updateSheet(text) {
        var el = document.getElementById('apAddressText');
        if (!el) return;
        el.textContent = text || '\u00a0';
        el.classList.toggle('ap-empty', !text);
    }

    function setConfirmEnabled(on) {
        var btn = document.getElementById('apConfirmBtn');
        if (btn) btn.disabled = !on;
    }

    function initMap(center, zoom) {
        if (typeof L === 'undefined') return;
        var el = document.getElementById('apMap');
        if (!el) return;

        if (_map) {
            _map.setView(center, zoom || DEFAULT_ZOOM, { animate: false });
            setTimeout(function () { _map.invalidateSize(); }, 80);
            return;
        }

        _map = L.map(el, {
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
            var pin = document.getElementById('apPinLayer');
            if (pin) pin.classList.add('ap-lift');
            var sheet = document.getElementById('apAddressText');
            if (sheet) sheet.classList.add('ap-dim');
        });

        _map.on('moveend', function () {
            var pin = document.getElementById('apPinLayer');
            if (pin) pin.classList.remove('ap-lift');
            onMapStop();
        });

        setTimeout(function () { _map.invalidateSize(); }, 100);
    }

    function onMapStop() {
        if (!_map) return;
        if (_skipGeocode) {
            _skipGeocode = false;
            var sheet = document.getElementById('apAddressText');
            if (sheet) sheet.classList.remove('ap-dim');
            return;
        }

        clearTimeout(_debounceGeo);
        _debounceGeo = setTimeout(function () {
            var c = _map.getCenter();
            _state.lat = c.lat;
            _state.lng = c.lng;
            reverseGeocode(c.lat, c.lng);
        }, 280);
    }

    function reverseGeocode(lat, lng) {
        var req = ++_geocodeReq;
        setConfirmEnabled(false);

        fetch('/api/geocode/reverse?lat=' + lat + '&lon=' + lng + '&lang=ru')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (req !== _geocodeReq) return;
                _state.address = data.address || data.fullAddress || '';
                _state.lat = lat;
                _state.lng = lng;
                updateSheet(_state.address);
                setConfirmEnabled(!!_state.address);
                if (!_searchFocused) {
                    var input = document.getElementById('apSearchInput');
                    if (input) input.value = _state.address;
                }
                var sheet = document.getElementById('apAddressText');
                if (sheet) sheet.classList.remove('ap-dim');
            })
            .catch(function () {
                if (req !== _geocodeReq) return;
                _state.address = lat.toFixed(5) + ', ' + lng.toFixed(5);
                updateSheet(_state.address);
                setConfirmEnabled(true);
            });
    }

    function showToast(msg) {
        var el = document.getElementById('apGpsToast');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
        clearTimeout(showToast._t);
        showToast._t = setTimeout(function () { el.classList.add('hidden'); }, 3200);
    }

    function locateMe() {
        if (!navigator.geolocation) {
            showToast(t('gpsOff'));
            return;
        }
        var btn = document.getElementById('apLocateBtn');
        if (btn) btn.classList.add('ap-busy');

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                if (btn) btn.classList.remove('ap-busy');
                setLocation(pos.coords.latitude, pos.coords.longitude, null, { zoom: GPS_ZOOM });
            },
            function (err) {
                if (btn) btn.classList.remove('ap-busy');
                showToast(err.code === 1 ? t('gpsDenied') : t('gpsOff'));
            },
            { enableHighAccuracy: true, timeout: 14000, maximumAge: 0 }
        );
    }

    function bindSheetDrag() {
        var grab = document.getElementById('apSheetGrab');
        var sheet = document.getElementById('apSheet');
        if (!grab || !sheet) return;
        var expanded = false;
        grab.addEventListener('click', function () {
            expanded = !expanded;
            sheet.classList.toggle('ap-expanded', expanded);
        });
    }

    function zoomIn() { if (_map) _map.zoomIn(); }
    function zoomOut() { if (_map) _map.zoomOut(); }

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
        _searchFocused = false;
        _skipGeocode = false;

        ensureOverlay();
        applyLabels();
        hideSuggestions();

        var input = document.getElementById('apSearchInput');
        if (input) input.value = options.address || '';

        var sheet = document.getElementById('apSheet');
        if (sheet) sheet.classList.remove('ap-expanded');

        _overlay.classList.add('ap-open');
        document.body.style.overflow = 'hidden';

        var center = DEFAULT_CENTER;
        var zoom = DEFAULT_ZOOM;

        if (options.latitude != null && options.longitude != null) {
            center = [options.latitude, options.longitude];
            zoom = GPS_ZOOM;
            _state.lat = options.latitude;
            _state.lng = options.longitude;
            _state.address = options.address || '';
            updateSheet(_state.address);
            setConfirmEnabled(!!_state.address);
        } else {
            _state = { lat: null, lng: null, address: '' };
            updateSheet('');
            setConfirmEnabled(false);
        }

        setTimeout(function () {
            initMap(center, zoom);
            if (options.latitude != null) {
                if (!_state.address) reverseGeocode(options.latitude, options.longitude);
            } else {
                locateMe();
            }
        }, 60);
    }

    function close() {
        if (_overlay) _overlay.classList.remove('ap-open');
        document.body.style.overflow = '';
        hideSuggestions();
    }

    function bindCheckout(options) {
        options = options || {};
        var slug = options.slug || window.restaurantSlug || (window.RESTAURANT && window.RESTAURANT.slug) || 'default';

        var fieldBox = document.getElementById('addressFieldBox');
        var display = document.getElementById('addressDisplay');
        var latInput = document.getElementById('latitude');
        var lngInput = document.getElementById('longitude');
        var addressInput = document.getElementById('address');

        function updateDisplay(text) {
            var label = text || t('selectOnMapCheckout');
            if (display) {
                display.textContent = label;
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
                onConfirm: function (r) {
                    updateDisplay(r.address);
                    if (latInput) latInput.value = r.latitude;
                    if (lngInput) lngInput.value = r.longitude;
                }
            });
        }

        if (fieldBox) fieldBox.addEventListener('click', openPicker);
        if (display) display.addEventListener('click', openPicker);

        if (options.autoOpen && (!latInput || !latInput.value)) {
            setTimeout(openPicker, 280);
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

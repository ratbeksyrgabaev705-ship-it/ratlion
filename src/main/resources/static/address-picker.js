/**
 * AddressPicker — Google / Yandex Maps UI
 */
window.AddressPicker = (function () {
    'use strict';

    var DEFAULT_CENTER = [42.8746, 74.5698];
    var DEFAULT_ZOOM = 17;
    var GPS_ZOOM = 18;

    var TEXT = {
        ky: {
            pickTitle: 'Даректи тандоо',
            searchPlaceholder: 'Даректи жазыңыз...',
            myLocation: 'Менин жайгашкан жерим',
            confirmAddress: 'Бул даректи тандоо',
            selectOnMapCheckout: 'Даректи тандаңыз',
            defaultSub: 'Бишкек, Кыргызстан',
            gpsOff: 'GPS күйгүзүңүз',
            gpsDenied: 'Геолокацияга уруксат бериңиз'
        },
        ru: {
            pickTitle: 'Выбор адреса',
            searchPlaceholder: 'Введите адрес...',
            myLocation: 'Моё местоположение',
            confirmAddress: 'Выбрать этот адрес',
            selectOnMapCheckout: 'Выберите адрес',
            defaultSub: 'Бишкек, Кыргызстан',
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
    var _state = { lat: null, lng: null, address: '', fullAddress: '' };
    var _onConfirm = null;
    var _slug = '';
    var _speech = null;

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

    function parseLines(shortAddr, fullAddr) {
        var main = (shortAddr || '').trim();
        var sub = t('defaultSub');
        var full = (fullAddr || shortAddr || '').trim();

        if (full) {
            if (/бишкек|bishkek/i.test(full)) {
                sub = t('defaultSub');
            } else {
                var parts = full.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                if (parts.length >= 2) sub = parts.slice(-2).join(', ');
            }
        }
        if (!main && full) {
            main = full.split(',')[0].trim();
        }
        return { main: main, sub: sub };
    }

    function ensureOverlay() {
        if (_overlay) return;

        _overlay = document.createElement('div');
        _overlay.id = 'addressPickerOverlay';
        _overlay.className = 'ap-overlay';
        _overlay.innerHTML =
            '<div class="ap-topbar">' +
            '  <button type="button" class="ap-back" onclick="AddressPicker.close()" aria-label="Артка">' +
            '    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>' +
            '  </button>' +
            '  <h1 class="ap-topbar-title" id="apTitle"></h1>' +
            '  <span></span>' +
            '</div>' +
            '<div class="ap-search-row">' +
            '  <div class="ap-search-wrap">' +
            '    <div class="ap-search-box">' +
            '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>' +
            '      <input type="search" id="apSearchInput" class="ap-search-input" autocomplete="off" enterkeyhint="search">' +
            '      <button type="button" class="ap-mic-btn" id="apMicBtn" aria-label="Үн">' +
            '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>' +
            '      </button>' +
            '    </div>' +
            '    <div id="apSuggestions" class="ap-suggestions hidden"></div>' +
            '  </div>' +
            '</div>' +
            '<div class="ap-map-area">' +
            '  <div id="apMap" class="ap-map"></div>' +
            '  <div class="ap-pin-layer" id="apPinLayer">' +
            '    <div class="ap-pin-shadow"></div>' +
            '    <div class="ap-pin">' +
            '      <svg viewBox="0 0 38 50" fill="none"><path d="M19 0C9 0 1.5 7.5 1.5 17.5c0 13 17.5 32.5 17.5 32.5S36.5 30.5 36.5 17.5C36.5 7.5 29 0 19 0z" fill="#22c55e" stroke="#fff" stroke-width="1.5"/><circle cx="19" cy="17.5" r="6.5" fill="#fff"/></svg>' +
            '    </div>' +
            '  </div>' +
            '  <button type="button" class="ap-gps-btn" id="apLocateBtn" onclick="AddressPicker.locateMe()">' +
            '    <span class="ap-gps-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#4285F4" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="#4285F4"/><line x1="12" y1="2" x2="12" y2="6" stroke="#4285F4" stroke-width="1.5"/><line x1="12" y1="18" x2="12" y2="22" stroke="#4285F4" stroke-width="1.5"/><line x1="2" y1="12" x2="6" y2="12" stroke="#4285F4" stroke-width="1.5"/><line x1="18" y1="12" x2="22" y2="12" stroke="#4285F4" stroke-width="1.5"/></svg></span>' +
            '    <span class="ap-gps-label" id="apLocateText"></span>' +
            '  </button>' +
            '  <div class="ap-zoom">' +
            '    <button type="button" onclick="AddressPicker.zoomIn()">+</button>' +
            '    <button type="button" onclick="AddressPicker.zoomOut()">−</button>' +
            '  </div>' +
            '  <div id="apGpsToast" class="ap-toast hidden"></div>' +
            '</div>' +
            '<div class="ap-sheet" id="apSheet">' +
            '  <div class="ap-sheet-grab" id="apSheetGrab"></div>' +
            '  <div class="ap-sheet-row" id="apSheetRow">' +
            '    <div class="ap-addr-icon">' +
            '      <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10z" fill="#22c55e"/><circle cx="12" cy="11" r="2.5" fill="#fff"/></svg>' +
            '    </div>' +
            '    <div class="ap-addr-texts">' +
            '      <div class="ap-addr-main ap-empty" id="apAddrMain">&nbsp;</div>' +
            '      <div class="ap-addr-sub" id="apAddrSub"></div>' +
            '    </div>' +
            '  </div>' +
            '  <button type="button" class="ap-confirm" id="apConfirmBtn" onclick="AddressPicker.confirm()" disabled></button>' +
            '</div>';

        document.body.appendChild(_overlay);
        bindSearch();
        bindMic();
        bindSheetDrag();
    }

    function applyLabels() {
        var title = document.getElementById('apTitle');
        if (title) title.textContent = t('pickTitle');
        var inp = document.getElementById('apSearchInput');
        if (inp) inp.placeholder = t('searchPlaceholder');
        var loc = document.getElementById('apLocateText');
        if (loc) loc.textContent = t('myLocation');
        var btn = document.getElementById('apConfirmBtn');
        if (btn) btn.textContent = t('confirmAddress');
        var sub = document.getElementById('apAddrSub');
        if (sub && !sub.textContent) sub.textContent = t('defaultSub');
    }

    function bindMic() {
        var btn = document.getElementById('apMicBtn');
        if (!btn) return;
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            btn.style.display = 'none';
            return;
        }
        btn.addEventListener('click', function () {
            if (_speech) {
                _speech.stop();
                return;
            }
            _speech = new SR();
            _speech.lang = lang() === 'ru' ? 'ru-RU' : 'ky-KG';
            _speech.interimResults = false;
            _speech.maxAlternatives = 1;
            btn.classList.add('ap-recording');
            _speech.onresult = function (e) {
                var text = e.results[0][0].transcript;
                var input = document.getElementById('apSearchInput');
                if (input) {
                    input.value = text;
                    runSearch(text.trim());
                    input.focus();
                }
            };
            _speech.onend = function () {
                btn.classList.remove('ap-recording');
                _speech = null;
            };
            _speech.onerror = function () {
                btn.classList.remove('ap-recording');
                _speech = null;
            };
            _speech.start();
        });
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
            if (q.length < 2) { hideSuggestions(); return; }
            _debounceSearch = setTimeout(function () { runSearch(q); }, 300);
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
                '<span class="ap-sug-text">' + esc(item.label || item.address) + '</span></button>';
        }).join('');
        box.classList.remove('hidden');
        box._items = list;
        box.querySelectorAll('.ap-sug-item').forEach(function (el) {
            el.addEventListener('mousedown', function (e) {
                e.preventDefault();
                selectSearchResult(box._items[parseInt(el.getAttribute('data-i'), 10)]);
            });
        });
    }

    function hideSuggestions() {
        var box = document.getElementById('apSuggestions');
        if (box) { box.classList.add('hidden'); box.innerHTML = ''; }
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
        _state.fullAddress = item.label || item.address || '';
        setLocation(parseFloat(item.lat), parseFloat(item.lng), item.address || item.label, {
            zoom: GPS_ZOOM,
            skipGeocode: true
        });
        updateSheet(item.address || item.label, _state.fullAddress);
    }

    function setLocation(lat, lng, address, opts) {
        opts = opts || {};
        _state.lat = lat;
        _state.lng = lng;
        if (address) _state.address = address;

        if (!opts.skipGeocode) {
            updateSheet(address || '', _state.fullAddress);
        }
        setConfirmEnabled(!!(address || _state.address));

        if (!_searchFocused) {
            var input = document.getElementById('apSearchInput');
            if (input && address) input.value = address;
        }

        if (_map) {
            _skipGeocode = !!opts.skipGeocode;
            _map.setView([lat, lng], opts.zoom || _map.getZoom() || GPS_ZOOM, { animate: true });
        }

        if (!opts.skipGeocode) reverseGeocode(lat, lng);
    }

    function updateSheet(shortAddr, fullAddr) {
        var lines = parseLines(shortAddr || _state.address, fullAddr || _state.fullAddress);
        var main = document.getElementById('apAddrMain');
        var sub = document.getElementById('apAddrSub');
        if (main) {
            main.textContent = lines.main || '\u00a0';
            main.classList.toggle('ap-empty', !lines.main);
        }
        if (sub) sub.textContent = lines.sub;
    }

    function setConfirmEnabled(on) {
        var btn = document.getElementById('apConfirmBtn');
        if (btn) btn.disabled = !on;
    }

    function setSheetDim(on) {
        var row = document.getElementById('apSheetRow');
        if (row) row.classList.toggle('ap-dim', !!on);
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

        /* OpenStreetMap — актуалдуу маалымат, жаңы имараттар */
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            maxNativeZoom: 19
        }).addTo(_map);

        _map.on('movestart', function () {
            document.getElementById('apPinLayer').classList.add('ap-lift');
            setSheetDim(true);
        });

        _map.on('moveend', function () {
            document.getElementById('apPinLayer').classList.remove('ap-lift');
            onMapStop();
        });

        setTimeout(function () { _map.invalidateSize(); }, 100);
    }

    function onMapStop() {
        if (!_map) return;
        if (_skipGeocode) {
            _skipGeocode = false;
            setSheetDim(false);
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
                _state.fullAddress = data.fullAddress || _state.address;
                _state.lat = lat;
                _state.lng = lng;
                updateSheet(_state.address, _state.fullAddress);
                setConfirmEnabled(!!_state.address);
                if (!_searchFocused) {
                    var input = document.getElementById('apSearchInput');
                    if (input) input.value = _state.address;
                }
                setSheetDim(false);
            })
            .catch(function () {
                if (req !== _geocodeReq) return;
                _state.address = lat.toFixed(5) + ', ' + lng.toFixed(5);
                _state.fullAddress = _state.address;
                updateSheet(_state.address, _state.fullAddress);
                setConfirmEnabled(true);
                setSheetDim(false);
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
        grab.addEventListener('click', function () {
            sheet.classList.toggle('ap-expanded');
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
            _state.fullAddress = options.address || '';
            updateSheet(_state.address, _state.fullAddress);
            setConfirmEnabled(!!_state.address);
        } else {
            _state = { lat: null, lng: null, address: '', fullAddress: '' };
            updateSheet('', '');
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
        if (_speech) { try { _speech.stop(); } catch (e) { /* ignore */ } }
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

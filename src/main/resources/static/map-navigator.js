/**
 * MapNavigator — карта колдонмолорун ачуу
 * mode: 'view' = чекитти көрсөтүү (карта), 'navigate' = маршрут (курьер)
 */
window.MapNavigator = (function () {
    'use strict';

    var MAP_PROVIDERS = [
        {
            id: 'google',
            name: 'Google Maps',
            icon: '🗺️',
            androidPackage: 'com.google.android.apps.maps',
            viewUrl: function (d) {
                if (d.hasCoords) {
                    return 'https://www.google.com/maps/search/?api=1&query=' + d.lat + ',' + d.lng;
                }
                return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(d.address);
            },
            viewScheme: function (d) {
                if (d.hasCoords) {
                    return 'comgooglemaps://?q=' + d.lat + ',' + d.lng + '&center=' + d.lat + ',' + d.lng + '&zoom=17';
                }
                return 'comgooglemaps://?q=' + encodeURIComponent(d.address);
            },
            navigationUrl: function (d) {
                if (d.hasCoords) {
                    return 'https://www.google.com/maps/dir/?api=1&destination=' + d.lat + ',' + d.lng + '&travelmode=driving';
                }
                return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(d.address) + '&travelmode=driving';
            },
            iosScheme: function (d) {
                if (d.hasCoords) {
                    return 'comgooglemaps://?daddr=' + d.lat + ',' + d.lng + '&directionsmode=driving';
                }
                return 'comgooglemaps://?daddr=' + encodeURIComponent(d.address) + '&directionsmode=driving';
            }
        },
        {
            id: 'yandex',
            name: 'Yandex Maps',
            icon: '🟡',
            androidPackage: 'ru.yandex.yandexmaps',
            viewUrl: function (d) {
                if (d.hasCoords) {
                    return 'https://yandex.ru/maps/?ll=' + d.lng + ',' + d.lat + '&z=17&pt=' + d.lng + ',' + d.lat + ',pm2rdm&l=map';
                }
                return 'https://yandex.ru/maps/?text=' + encodeURIComponent(d.address);
            },
            viewScheme: function (d) {
                if (d.hasCoords) {
                    return 'yandexmaps://maps.yandex.ru/?pt=' + d.lng + ',' + d.lat + '&z=17&l=map';
                }
                return 'yandexmaps://maps.yandex.ru/?text=' + encodeURIComponent(d.address);
            },
            navigationUrl: function (d) {
                if (d.hasCoords) {
                    return 'https://yandex.ru/maps/?rtext=~' + d.lat + ',' + d.lng + '&rtt=auto';
                }
                return 'https://yandex.ru/maps/?text=' + encodeURIComponent(d.address);
            },
            iosScheme: function (d) {
                if (d.hasCoords) {
                    return 'yandexmaps://maps.yandex.ru/?rtext=~' + d.lat + ',' + d.lng + '&rtt=auto';
                }
                return 'yandexmaps://maps.yandex.ru/?text=' + encodeURIComponent(d.address);
            }
        },
        {
            id: '2gis',
            name: '2GIS',
            icon: '📍',
            androidPackage: 'ru.dublgis.dgismobile',
            viewUrl: function (d) {
                if (d.hasCoords) {
                    return 'https://2gis.ru/bishkek/geo/' + d.lng + ',' + d.lat + '?m=' + d.lng + ',' + d.lat + '%2F17';
                }
                return 'https://2gis.ru/bishkek/search/' + encodeURIComponent(d.address);
            },
            viewScheme: function (d) {
                if (d.hasCoords) {
                    return 'dgis://2gis.ru/bishkek/geo/' + d.lng + ',' + d.lat;
                }
                return 'dgis://2gis.ru/bishkek/search/' + encodeURIComponent(d.address);
            },
            navigationUrl: function (d) {
                if (d.hasCoords) {
                    return 'https://2gis.ru/bishkek/directions/points/%7C' + d.lat + '%2C' + d.lng;
                }
                return 'https://2gis.ru/bishkek/search/' + encodeURIComponent(d.address);
            },
            iosScheme: function (d) {
                if (d.hasCoords) {
                    return 'dgis://2gis.ru/routeSearch/rsType/car/to/' + d.lat + ',' + d.lng;
                }
                return 'dgis://2gis.ru/bishkek/search/' + encodeURIComponent(d.address);
            }
        },
        {
            id: 'mapsme',
            name: 'MAPS.ME',
            icon: '🧭',
            androidPackage: 'com.mapswithme.maps.pro',
            viewUrl: function (d) {
                if (d.hasCoords) {
                    return 'https://maps.me/map?v=1&ll=' + d.lat + ',' + d.lng + '&n=' + encodeURIComponent(d.label || 'Location') + '&scale=17';
                }
                return 'https://maps.me/search?query=' + encodeURIComponent(d.address);
            },
            viewScheme: function (d) {
                if (d.hasCoords) {
                    return 'mapsme://map?v=1&ll=' + d.lat + ',' + d.lng + '&n=' + encodeURIComponent(d.label || 'Location') + '&scale=17';
                }
                return 'mapsme://search?query=' + encodeURIComponent(d.address);
            },
            navigationUrl: function (d) {
                if (d.hasCoords) {
                    return 'https://maps.me/route?sll=' + d.lat + ',' + d.lng + '&dll=' + d.lat + ',' + d.lng + '&type=vehicle';
                }
                return 'https://maps.me/search?query=' + encodeURIComponent(d.address);
            },
            iosScheme: function (d) {
                if (d.hasCoords) {
                    return 'mapsme://route?sll=' + d.lat + ',' + d.lng + '&dll=' + d.lat + ',' + d.lng + '&type=vehicle';
                }
                return 'mapsme://search?query=' + encodeURIComponent(d.address);
            }
        },
        {
            id: 'waze',
            name: 'Waze',
            icon: '🚗',
            androidPackage: 'com.waze',
            viewUrl: function (d) {
                if (d.hasCoords) {
                    return 'https://waze.com/ul?ll=' + d.lat + ',' + d.lng + '&navigate=no';
                }
                return 'https://waze.com/ul?q=' + encodeURIComponent(d.address) + '&navigate=no';
            },
            viewScheme: function (d) {
                if (d.hasCoords) {
                    return 'waze://?ll=' + d.lat + ',' + d.lng + '&navigate=no';
                }
                return 'waze://?q=' + encodeURIComponent(d.address) + '&navigate=no';
            },
            navigationUrl: function (d) {
                if (d.hasCoords) {
                    return 'https://waze.com/ul?ll=' + d.lat + ',' + d.lng + '&navigate=yes';
                }
                return 'https://waze.com/ul?q=' + encodeURIComponent(d.address) + '&navigate=yes';
            },
            iosScheme: function (d) {
                if (d.hasCoords) {
                    return 'waze://?ll=' + d.lat + ',' + d.lng + '&navigate=yes';
                }
                return 'waze://?q=' + encodeURIComponent(d.address) + '&navigate=yes';
            }
        }
    ];

    var _sheetEl = null;
    var _noAppEl = null;
    var _pendingDest = null;
    var _pendingMode = 'navigate';

    function isAndroid() {
        return /Android/i.test(navigator.userAgent);
    }

    function isIOS() {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    function normalizeAddress(address) {
        var a = String(address || '').trim();
        if (!a) return '';
        if (/бишкек|bishkek/i.test(a)) return a;
        return a + ', Бишкек';
    }

    function resolveDestination(data) {
        var lat = parseFloat(data.latitude != null ? data.latitude : data.lat);
        var lng = parseFloat(data.longitude != null ? data.longitude : data.lng);
        var hasCoords = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);
        var rawAddress = data.address || (typeof data === 'string' ? data : '');
        var address = normalizeAddress(rawAddress);
        return {
            lat: lat,
            lng: lng,
            address: address,
            label: address || (hasCoords ? lat + ',' + lng : ''),
            hasCoords: hasCoords,
            mode: data.mode === 'view' ? 'view' : 'navigate'
        };
    }

    function providerWebUrl(provider, dest) {
        if (dest.mode === 'view' && provider.viewUrl) return provider.viewUrl(dest);
        return provider.navigationUrl(dest);
    }

    function providerAppScheme(provider, dest) {
        if (dest.mode === 'view' && provider.viewScheme) return provider.viewScheme(dest);
        return provider.iosScheme(dest);
    }

    function buildGeoUri(dest) {
        if (dest.hasCoords) {
            var label = dest.label ? encodeURIComponent(dest.label) : '';
            return 'geo:' + dest.lat + ',' + dest.lng + '?q=' + dest.lat + ',' + dest.lng + (label ? '(' + label + ')' : '');
        }
        return 'geo:0,0?q=' + encodeURIComponent(dest.address);
    }

    function browserFallbackUrl(dest) {
        var google = MAP_PROVIDERS[0];
        return providerWebUrl(google, dest);
    }

    function buildAndroidChooserIntent(dest) {
        var geo = buildGeoUri(dest);
        var fallback = browserFallbackUrl(dest);
        var geoPath = geo.replace(/^geo:/, '');
        return 'intent://geo:' + geoPath + '#Intent;scheme=geo;action=android.intent.action.VIEW;S.browser_fallback_url='
            + encodeURIComponent(fallback) + ';end';
    }

    function sheetTitle(mode) {
        return mode === 'view' ? 'Картада көрүү' : 'Карта колдонмосун тандаңыз';
    }

    function ensureSheet() {
        if (_sheetEl) return;
        _sheetEl = document.createElement('div');
        _sheetEl.id = 'mapNavSheet';
        _sheetEl.className = 'map-nav-sheet c-hidden';
        _sheetEl.innerHTML =
            '<div class="map-nav-backdrop" onclick="MapNavigator.closeSheet()"></div>' +
            '<div class="map-nav-panel">' +
            '  <div class="map-nav-head">' +
            '    <span class="map-nav-title" id="mapNavTitle">Карта колдонмосун тандаңыз</span>' +
            '    <button type="button" class="map-nav-close" onclick="MapNavigator.closeSheet()" aria-label="Жабуу">✕</button>' +
            '  </div>' +
            '  <div class="map-nav-addr" id="mapNavAddr"></div>' +
            '  <div class="map-nav-list" id="mapNavList"></div>' +
            '</div>';
        document.body.appendChild(_sheetEl);

        _noAppEl = document.createElement('div');
        _noAppEl.id = 'mapNavNoApp';
        _noAppEl.className = 'map-nav-sheet c-hidden';
        _noAppEl.innerHTML =
            '<div class="map-nav-backdrop" onclick="MapNavigator.closeNoApp()"></div>' +
            '<div class="map-nav-panel map-nav-panel-sm">' +
            '  <div class="map-nav-head">' +
            '    <span class="map-nav-title">Карта колдонмосу табылган жок</span>' +
            '    <button type="button" class="map-nav-close" onclick="MapNavigator.closeNoApp()" aria-label="Жабуу">✕</button>' +
            '  </div>' +
            '  <p class="map-nav-msg" id="mapNavNoAppMsg">Телефондо карта колдонмосу орнотулган эмес.</p>' +
            '  <button type="button" class="map-nav-btn map-nav-btn-primary" onclick="MapNavigator.openInBrowser()">🌐 Браузерде ачуу</button>' +
            '  <button type="button" class="map-nav-btn map-nav-btn-secondary" onclick="MapNavigator.closeNoApp()">Жабуу</button>' +
            '</div>';
        document.body.appendChild(_noAppEl);
    }

    function injectStyles() {
        if (document.getElementById('mapNavStyles')) return;
        var style = document.createElement('style');
        style.id = 'mapNavStyles';
        style.textContent =
            '.map-nav-sheet{position:fixed;inset:0;z-index:200;display:flex;align-items:flex-end;justify-content:center}' +
            '.map-nav-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.55)}' +
            '.map-nav-panel{position:relative;width:100%;max-width:520px;background:#1e1e1e;border-radius:18px 18px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));border:1px solid #2a2a2a;animation:mapNavSlide 0.25s ease}' +
            '.map-nav-panel-sm{max-width:400px;border-radius:18px;margin:auto 16px 16px}' +
            '@keyframes mapNavSlide{from{transform:translateY(100%)}to{transform:translateY(0)}}' +
            '.map-nav-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}' +
            '.map-nav-title{font-size:15px;font-weight:800;color:#f5f5f5}' +
            '.map-nav-close{width:36px;height:36px;border:none;border-radius:10px;background:#2a2a2a;color:#ccc;font-size:16px;cursor:pointer}' +
            '.map-nav-addr{font-size:12px;color:#8a8a8a;margin-bottom:12px;line-height:1.4;word-break:break-word}' +
            '.map-nav-list{display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow-y:auto}' +
            '.map-nav-item{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;border:1px solid #2a2a2a;border-radius:12px;background:#161616;color:#f5f5f5;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;text-align:left}' +
            '.map-nav-item:active{background:#252525}' +
            '.map-nav-item-icon{font-size:22px;width:28px;text-align:center}' +
            '.map-nav-msg{font-size:13px;color:#8a8a8a;line-height:1.5;margin-bottom:16px}' +
            '.map-nav-btn{width:100%;padding:14px;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:8px}' +
            '.map-nav-btn-primary{background:#22c55e;color:#fff}' +
            '.map-nav-btn-secondary{background:#2a2a2a;color:#ccc}';
        document.head.appendChild(style);
    }

    function showSheet(dest) {
        ensureSheet();
        injectStyles();
        _pendingDest = dest;
        _pendingMode = dest.mode || 'navigate';

        var titleEl = document.getElementById('mapNavTitle');
        if (titleEl) titleEl.textContent = sheetTitle(_pendingMode);

        var addrEl = document.getElementById('mapNavAddr');
        var listEl = document.getElementById('mapNavList');
        if (addrEl) {
            addrEl.textContent = dest.hasCoords
                ? '📍 ' + dest.lat.toFixed(6) + ', ' + dest.lng.toFixed(6) + (dest.address ? ' · ' + dest.address : '')
                : '📍 ' + dest.address;
        }
        if (listEl) {
            listEl.innerHTML = MAP_PROVIDERS.map(function (p) {
                return '<button type="button" class="map-nav-item" onclick="MapNavigator.openProvider(\'' + p.id + '\')">' +
                    '<span class="map-nav-item-icon">' + p.icon + '</span>' +
                    '<span>' + p.name + '</span></button>';
            }).join('') +
            '<button type="button" class="map-nav-item" onclick="MapNavigator.openInBrowser()">' +
            '<span class="map-nav-item-icon">🌐</span><span>Браузерде ачуу</span></button>';
        }
        _sheetEl.classList.remove('c-hidden');
    }

    function closeSheet() {
        if (_sheetEl) _sheetEl.classList.add('c-hidden');
    }

    function showNoAppDialog(dest) {
        ensureSheet();
        injectStyles();
        _pendingDest = dest;
        _pendingMode = dest.mode || 'navigate';
        var msgEl = document.getElementById('mapNavNoAppMsg');
        if (msgEl) {
            msgEl.textContent = _pendingMode === 'view'
                ? 'Телефондо карта колдонмосу орнотулган эмес. Браузерде картаны ача аласыз.'
                : 'Телефондо карта колдонмосу орнотулган эмес. Браузерде маршрутту ача аласыз.';
        }
        _noAppEl.classList.remove('c-hidden');
    }

    function closeNoApp() {
        if (_noAppEl) _noAppEl.classList.add('c-hidden');
    }

    function openUrl(url) {
        var a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function openAndroidChooser(dest) {
        _pendingDest = dest;
        _pendingMode = dest.mode || 'navigate';
        var intent = buildAndroidChooserIntent(dest);
        var geo = buildGeoUri(dest);
        var openedAt = Date.now();

        window.location.href = intent;

        setTimeout(function () {
            if (document.visibilityState === 'visible' && Date.now() - openedAt >= 2000) {
                try {
                    window.location.href = geo;
                } catch (e) { /* ignore */ }
            }
        }, 800);

        setTimeout(function () {
            if (document.visibilityState === 'visible' && Date.now() - openedAt >= 2800) {
                showNoAppDialog(dest);
            }
        }, 3000);
    }

    function openProvider(providerId) {
        var dest = _pendingDest;
        if (!dest) return;
        var provider = MAP_PROVIDERS.find(function (p) { return p.id === providerId; });
        if (!provider) return;
        closeSheet();

        var webUrl = providerWebUrl(provider, dest);
        var appScheme = providerAppScheme(provider, dest);

        if (isAndroid()) {
            var intent = 'intent:' + webUrl.replace(/^https?:/, '') + '#Intent;scheme=https;package='
                + provider.androidPackage + ';S.browser_fallback_url='
                + encodeURIComponent(webUrl) + ';end';
            window.location.href = intent;
            return;
        }

        if (isIOS() && appScheme) {
            window.location.href = appScheme;
            setTimeout(function () {
                if (document.visibilityState === 'visible') {
                    openUrl(webUrl);
                }
            }, 1500);
            return;
        }

        openUrl(webUrl);
    }

    function openInBrowser(dest) {
        var d = dest || _pendingDest;
        if (!d) return;
        closeNoApp();
        closeSheet();
        openUrl(browserFallbackUrl(d));
    }

    function openMap(dest, mode) {
        dest.mode = mode || dest.mode || 'navigate';
        _pendingMode = dest.mode;

        if (!dest.hasCoords && !dest.address) {
            alert('Дарек көрсөтүлгөн эмес');
            return;
        }

        if (isAndroid()) {
            openAndroidChooser(dest);
            return;
        }

        showSheet(dest);
    }

    /** Курьер: маршрут менен ачуу */
    function viewAddress(data) {
        var dest = resolveDestination(data || {});
        dest.mode = 'navigate';
        openMap(dest, 'navigate');
    }

    /** Кардар: жайгашкан жерди картада көрсөтүү (навигация ЭМЕС) */
    function showLocation(data) {
        var dest = resolveDestination(data || {});
        dest.mode = 'view';
        openMap(dest, 'view');
    }

    function viewAddressFromEl(el) {
        if (!el) return;
        viewAddress({
            address: el.getAttribute('data-address') || '',
            latitude: el.getAttribute('data-lat') || null,
            longitude: el.getAttribute('data-lng') || null
        });
    }

    return {
        MAP_PROVIDERS: MAP_PROVIDERS,
        resolveDestination: resolveDestination,
        viewAddress: viewAddress,
        showLocation: showLocation,
        viewAddressFromEl: viewAddressFromEl,
        openProvider: openProvider,
        openInBrowser: openInBrowser,
        showSheet: showSheet,
        closeSheet: closeSheet,
        closeNoApp: closeNoApp,
        isAndroid: isAndroid,
        isIOS: isIOS
    };
})();

/**
 * RATLION — Telegram WebApp / in-app browser
 */
(function () {
    'use strict';

    function isTelegramUa() {
        return /Telegram/i.test(navigator.userAgent || '');
    }

    function hasWebApp() {
        return !!(window.Telegram && window.Telegram.WebApp);
    }

    function fixViewport() {
        if (!isTelegramUa() && !hasWebApp()) {
            return;
        }
        var meta = document.querySelector('meta[name="viewport"]');
        if (meta) {
            meta.setAttribute(
                'content',
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
            );
        }
    }

    fixViewport();

    function applyTheme(tg) {
        var tp = tg.themeParams || {};
        var root = document.documentElement;
        if (tp.bg_color) {
            document.body.style.backgroundColor = tp.bg_color;
            root.style.setProperty('--tg-bg', tp.bg_color);
        }
        if (tp.text_color) {
            root.style.setProperty('--tg-text', tp.text_color);
        }
        if (tp.button_color) {
            root.style.setProperty('--tg-button', tp.button_color);
        }
        if (typeof tg.setHeaderColor === 'function' && tp.header_bg_color) {
            tg.setHeaderColor(tp.header_bg_color);
        }
        if (typeof tg.setBackgroundColor === 'function' && tp.bg_color) {
            tg.setBackgroundColor(tp.bg_color);
        }
    }

    function bindBackButton(tg) {
        if (!tg.BackButton) {
            return;
        }

        function shouldShowBack() {
            var backBtn = document.getElementById('backBtn');
            if (backBtn && !backBtn.classList.contains('hidden')) {
                return true;
            }
            if (typeof window.currentStep === 'number' && window.currentStep > 2) {
                return true;
            }
            return false;
        }

        function syncBack() {
            if (shouldShowBack()) {
                tg.BackButton.show();
            } else {
                tg.BackButton.hide();
            }
        }

        tg.BackButton.onClick(function () {
            if (typeof window.goBackStep === 'function') {
                window.goBackStep();
            } else {
                var backBtn = document.getElementById('backBtn');
                if (backBtn) {
                    backBtn.click();
                } else {
                    history.back();
                }
            }
            setTimeout(syncBack, 50);
        });

        syncBack();
        var backBtn = document.getElementById('backBtn');
        if (backBtn && typeof MutationObserver !== 'undefined') {
            new MutationObserver(syncBack).observe(backBtn, {
                attributes: true,
                attributeFilter: ['class']
            });
        }
        document.addEventListener('click', function () {
            setTimeout(syncBack, 80);
        });
    }

    function bindHaptics(tg) {
        if (!tg.HapticFeedback) {
            return;
        }
        document.addEventListener('click', function (e) {
            var btn = e.target.closest(
                '#submitButton, #nextButton, .fp-checkout-btn, .fam-cart-btn, .hub-link, button[type="submit"]'
            );
            if (btn) {
                tg.HapticFeedback.impactOccurred('light');
            }
        });
    }

    function initWebApp(tg) {
        tg.ready();
        tg.expand();
        if (typeof tg.disableVerticalSwipes === 'function') {
            tg.disableVerticalSwipes();
        }
        document.documentElement.classList.add('telegram-webapp');
        if (document.body) {
            document.body.classList.add('telegram-webapp');
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                document.body.classList.add('telegram-webapp');
            });
        }
        applyTheme(tg);
        bindBackButton(tg);
        bindHaptics(tg);
    }

    function loadSdk(callback) {
        if (hasWebApp()) {
            callback();
            return;
        }
        if (document.querySelector('script[data-telegram-sdk]')) {
            document.querySelector('script[data-telegram-sdk]').addEventListener('load', callback);
            return;
        }
        var script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-web-app.js';
        script.setAttribute('data-telegram-sdk', '1');
        script.onload = callback;
        document.head.appendChild(script);
    }

    window.TelegramApp = {
        isTelegram: isTelegramUa() || hasWebApp(),
        isWebApp: hasWebApp(),
        init: function () {
            loadSdk(function () {
                if (window.Telegram && window.Telegram.WebApp) {
                    initWebApp(window.Telegram.WebApp);
                }
            });
        }
    };

    if (hasWebApp()) {
        initWebApp(window.Telegram.WebApp);
    } else if (isTelegramUa()) {
        document.documentElement.classList.add('telegram-browser');
        document.addEventListener('DOMContentLoaded', function () {
            document.body.classList.add('telegram-browser');
        });
        loadSdk(function () {
            if (window.Telegram && window.Telegram.WebApp) {
                initWebApp(window.Telegram.WebApp);
            }
        });
    }
})();

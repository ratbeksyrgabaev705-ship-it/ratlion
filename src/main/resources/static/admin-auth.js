/**
 * RATLION — админ сессия + көрүү гана режим
 */
(function () {
    'use strict';

    window.RatlionAdmin = {
        session: null,
        ready: null,

        load: function () {
            if (this.ready) {
                return this.ready;
            }
            var self = this;
            this.ready = fetch('/api/admin/session', { credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    self.session = data;
                    if (data.readOnly) {
                        document.documentElement.classList.add('admin-readonly');
                        showReadOnlyBanner();
                    }
                    return data;
                })
                .catch(function () {
                    self.session = { authenticated: false };
                    return self.session;
                });
            return this.ready;
        },

        isReadOnly: function () {
            return !!(this.session && this.session.readOnly);
        },

        applyReadOnlyUi: function (root) {
            if (!this.isReadOnly()) {
                return;
            }
            var scope = root || document;
            scope.querySelectorAll(
                'button, input, select, textarea, a.delivery-btn-primary, a.adm-btn-primary'
            ).forEach(function (el) {
                if (el.closest('.admin-login-card, .admin-readonly-allow')) {
                    return;
                }
                if (el.type === 'button' || el.tagName === 'BUTTON') {
                    el.disabled = true;
                    el.title = 'Көрүү гана';
                } else if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                    if (el.type !== 'hidden') {
                        el.readOnly = true;
                        el.disabled = true;
                    }
                }
            });
        }
    };

    function showReadOnlyBanner() {
        if (document.getElementById('adminReadOnlyBanner')) {
            return;
        }
        var bar = document.createElement('div');
        bar.id = 'adminReadOnlyBanner';
        bar.textContent = '👁 Көрүү гана — өзгөртүүгө укук жок';
        bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#854d0e;color:#fff;text-align:center;padding:10px 12px;font:600 13px Inter,system-ui,sans-serif';
        document.body.appendChild(bar);
        document.body.style.paddingTop = '42px';
    }

    document.addEventListener('DOMContentLoaded', function () {
        RatlionAdmin.load().then(function () {
            RatlionAdmin.applyReadOnlyUi(document);
        });
    });
})();

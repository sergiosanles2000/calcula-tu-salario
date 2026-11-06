/**
 * AUTONOMOUS ENTERPRISE CLIENT ENGINE (common.js)
 * Production-ready UX, Theme management, Cookie Consent, and Analytics hooks.
 */

(function () {
  'use strict';

  // 1. Theme Management
  const initTheme = () => {
    const savedTheme = localStorage.getItem('site_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', activeTheme);

    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('site_theme', next);
      });
    }
  };

  // 2. Cookie Consent Banner (GDPR / ePrivacy Directive compliant)
  const initCookieConsent = () => {
    const banner = document.getElementById('cookie-banner');
    if (!banner) return;

    const consent = localStorage.getItem('cookie_consent_v1');
    if (!consent) {
      banner.style.display = 'block';
    }

    const btnAccept = document.getElementById('cookie-accept');
    const btnReject = document.getElementById('cookie-reject');

    if (btnAccept) {
      btnAccept.addEventListener('click', () => {
        const consentData = {
          necessary: true,
          analytics: true,
          marketing: true,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('cookie_consent_v1', JSON.stringify(consentData));
        banner.style.display = 'none';
        triggerConsentEvent(consentData);
      });
    }

    if (btnReject) {
      btnReject.addEventListener('click', () => {
        const consentData = {
          necessary: true,
          analytics: false,
          marketing: false,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('cookie_consent_v1', JSON.stringify(consentData));
        banner.style.display = 'none';
        triggerConsentEvent(consentData);
      });
    }
  };

  const triggerConsentEvent = (consentData) => {
    window.dispatchEvent(new CustomEvent('cookie_consent_updated', { detail: consentData }));
    if (window.dataLayer && consentData.analytics) {
      window.dataLayer.push({
        event: 'consent_update',
        analytics_storage: 'granted',
        ad_storage: consentData.marketing ? 'granted' : 'denied'
      });
    }
  };

  // 3. Accessible FAQ Accordions
  const initFAQ = () => {
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const isActive = item.classList.contains('active');
        // Close siblings if desired or simply toggle
        item.classList.toggle('active');
        btn.setAttribute('aria-expanded', !isActive);
      });
    });
  };

  // 4. Privacy-Friendly Event Telemetry & GA4 Hook
  window.enterpriseTrack = function (eventName, eventParams) {
    const consent = JSON.parse(localStorage.getItem('cookie_consent_v1') || '{}');
    const payload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
      ...eventParams
    };
    
    // Push to Google Analytics 4 dataLayer if initialized
    if (window.dataLayer && consent.analytics !== false) {
      window.dataLayer.push(payload);
    }

    // Optional Remote Collector (e.g. Cloudflare Worker or HTTPS Beacon)
    // Architectural Safeguard: Strictly prevent broken calls to localhost (127.0.0.1) from public visitor browsers
    const remoteEndpoint = window.ENTERPRISE_TELEMETRY_URL;
    if (remoteEndpoint && typeof remoteEndpoint === 'string') {
      const isPublicSite = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const isLocalEndpoint = remoteEndpoint.includes('127.0.0.1') || remoteEndpoint.includes('localhost');
      
      if (isPublicSite && isLocalEndpoint) {
        // Disallow mixed-content / unreachable localhost calls from public production
        return;
      }

      if (consent.analytics !== false) {
        try {
          if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(remoteEndpoint, blob);
          } else {
            fetch(remoteEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              mode: 'cors',
              keepalive: true
            }).catch(() => {});
          }
        } catch (e) {
          // Non-blocking silent fail
        }
      }
    }
  };

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initCookieConsent();
    initFAQ();
  });
})();

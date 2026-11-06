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

  // 2. Cookie Consent Banner (GDPR / ePrivacy Directive & Google Consent Mode v2 compliant)
  const updateGoogleConsent = (consentData) => {
    const marketingGranted = consentData.marketing === true;
    const analyticsGranted = consentData.analytics === true;

    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'ad_storage': marketingGranted ? 'granted' : 'denied',
        'ad_user_data': marketingGranted ? 'granted' : 'denied',
        'ad_personalization': marketingGranted ? 'granted' : 'denied',
        'analytics_storage': analyticsGranted ? 'granted' : 'denied'
      });
    }

    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'consent_update',
        ad_storage: marketingGranted ? 'granted' : 'denied',
        ad_user_data: marketingGranted ? 'granted' : 'denied',
        ad_personalization: marketingGranted ? 'granted' : 'denied',
        analytics_storage: analyticsGranted ? 'granted' : 'denied'
      });
    }
  };

  const initCookieConsent = () => {
    const banner = document.getElementById('cookie-banner');
    if (!banner) return;

    // Apply saved consent if available
    const savedConsentRaw = localStorage.getItem('cookie_consent_v1');
    if (savedConsentRaw) {
      try {
        const savedConsent = JSON.parse(savedConsentRaw);
        updateGoogleConsent(savedConsent);
      } catch (e) {
        // Safe json parse error ignore
      }
    } else {
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
        updateGoogleConsent(consentData);
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
        updateGoogleConsent(consentData);
        triggerConsentEvent(consentData);
      });
    }
  };

  const triggerConsentEvent = (consentData) => {
    window.dispatchEvent(new CustomEvent('cookie_consent_updated', { detail: consentData }));
  };

  // 3. Sticky Bottom Anchor Ad (Better Ads Standards: user-dismissible, non-intrusive)
  const initStickyAd = () => {
    const stickyContainer = document.getElementById('sticky-bottom-ad');
    const closeBtn = document.getElementById('close-sticky-ad');
    if (!stickyContainer) return;

    if (sessionStorage.getItem('ad_sticky_dismissed') === 'true') {
      stickyContainer.classList.add('dismissed');
      stickyContainer.style.display = 'none';
      return;
    }

    const showSticky = () => {
      const cookieBanner = document.getElementById('cookie-banner');
      const isCookieBannerVisible = cookieBanner && (cookieBanner.style.display === 'block' || window.getComputedStyle(cookieBanner).display === 'block');
      if (!isCookieBannerVisible && sessionStorage.getItem('ad_sticky_dismissed') !== 'true') {
        stickyContainer.style.display = 'block';
      }
    };

    let hasShown = false;
    const triggerShow = () => {
      if (hasShown) return;
      hasShown = true;
      showSticky();
    };

    window.addEventListener('scroll', triggerShow, { once: true, passive: true });
    setTimeout(triggerShow, 2000);

    // Also show when user interacts with cookie consent
    window.addEventListener('cookie_consent_updated', () => {
      setTimeout(showSticky, 500);
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        stickyContainer.classList.add('dismissed');
        stickyContainer.style.display = 'none';
        sessionStorage.setItem('ad_sticky_dismissed', 'true');
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
    let consent = {};
    try {
      consent = JSON.parse(localStorage.getItem('cookie_consent_v1') || '{}');
    } catch (e) {
      consent = {};
    }

    const metaSlug = document.querySelector('meta[name="enterprise-site-slug"]');
    const slug = (eventParams && eventParams.slug) || window.ENTERPRISE_SITE_SLUG || (metaSlug ? metaSlug.getAttribute('content') : '') || '';

    let eventType = 'custom';
    const lowerName = eventName.toLowerCase();
    if (lowerName === 'pageview' || lowerName === 'visit') {
      eventType = 'pageview';
    } else if (lowerName.includes('click')) {
      eventType = 'ad_click';
    } else if (lowerName.includes('calc') || lowerName.includes('quota') || lowerName.includes('salary') || lowerName.includes('mortgage') || lowerName.includes('severance') || lowerName.includes('macros')) {
      eventType = 'calculator_use';
    }

    const payload = {
      event: eventName,
      event_type: eventType,
      slug: slug,
      project_id: slug ? (slug.startsWith('proj-') ? slug : 'proj-' + slug) : '',
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
      ...eventParams
    };

    // 1. Google Analytics 4 native event push
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, eventParams || {});
    }

    // 2. dataLayer push for GTM / debugging
    if (window.dataLayer) {
      window.dataLayer.push(payload);
    }

    // 3. Optional Remote Collector (e.g. Cloudflare Worker or local HTTPS Beacon)
    // Architectural Safeguard: Strictly prevent broken calls to localhost (127.0.0.1) from public visitor browsers
    const remoteEndpoint = window.ENTERPRISE_TELEMETRY_URL;
    if (remoteEndpoint && typeof remoteEndpoint === 'string') {
      const isPublicSite = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const isLocalEndpoint = remoteEndpoint.includes('127.0.0.1') || remoteEndpoint.includes('localhost');
      
      if (isPublicSite && isLocalEndpoint) {
        // Disallow mixed-content / unreachable localhost calls from public production
        return;
      }

      // RGPD Guardrail: Only transmit if analytics consent has been granted
      if (consent.analytics === true) {
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
    initStickyAd();
    initFAQ();
  });
})();

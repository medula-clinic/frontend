document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const navToggle = document.querySelector('.nav__toggle');
  const navLinksWrapper = document.querySelector('.nav__links-wrapper');
  const navLinks = document.querySelectorAll('.nav__links a');
  const revealTargets = document.querySelectorAll('.reveal-on-scroll');
  const billingToggle = document.getElementById('billing-toggle');
  const planAmounts = document.querySelectorAll('.plan-card__amount[data-monthly]');
  const planTerms = document.querySelectorAll('.plan-card__term');
  const ctaButtons = document.querySelectorAll('.js-track-cta');
  const rippleTargets = document.querySelectorAll('.js-ripple');
  const footerForm = document.querySelector('.footer__form');

  /* ---------- Navigation toggle ---------- */
  if (navToggle && navLinksWrapper) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      navLinksWrapper.classList.toggle('is-active');
      body.classList.toggle('nav-open');
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navToggle.setAttribute('aria-expanded', 'false');
        navLinksWrapper.classList.remove('is-active');
        body.classList.remove('nav-open');
      });
    });
  }

  /* ---------- Scroll reveal animations ---------- */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealTargets.forEach(target => observer.observe(target));
  } else {
    revealTargets.forEach(target => target.classList.add('is-visible'));
  }

  /* ---------- Ripple effect for CTA buttons ---------- */
  const createRipple = event => {
    const target = event.currentTarget;
    const buttonRect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(buttonRect.width, buttonRect.height);
    const offsetX = event.clientX - buttonRect.left - size / 2;
    const offsetY = event.clientY - buttonRect.top - size / 2;

    ripple.className = 'ripple-effect';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${offsetX}px`;
    ripple.style.top = `${offsetY}px`;

    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  };

  rippleTargets.forEach(target => {
    target.addEventListener('pointerdown', createRipple, { passive: true });
  });

  /* ---------- Pricing toggle ---------- */
  const updatePricing = isYearly => {
    planAmounts.forEach(amountEl => {
      const monthly = amountEl.getAttribute('data-monthly');
      const yearly = amountEl.getAttribute('data-yearly');
      amountEl.textContent = isYearly ? yearly : monthly;
    });
    planTerms.forEach(termEl => {
      termEl.textContent = isYearly ? '/mo billed yearly' : '/mo';
    });
  };

  if (billingToggle) {
    billingToggle.addEventListener('change', event => {
      const isYearly = event.target.checked;
      updatePricing(isYearly);
      trackCta({
        action: 'toggle_pricing',
        label: isYearly ? 'yearly' : 'monthly'
      });
    });
  }

  /* ---------- CTA tracking ---------- */
  function trackCta({ action, label = '', value = '' }) {
    const payload = {
      event: 'cta_interaction',
      event_category: 'CTA',
      event_action: action,
      event_label: label,
      event_value: value,
      timestamp: Date.now()
    };

    if (window.dataLayer) {
      window.dataLayer.push(payload);
    } else {
      console.info('[Medula analytics]', payload);
    }
  }

  ctaButtons.forEach(button => {
    button.addEventListener('click', () => {
      const label = button.textContent?.trim() || 'cta';
      trackCta({ action: 'click', label });
    });
  });

  /* ---------- Footer demo form ---------- */
  if (footerForm) {
    const footerStatus = footerForm.querySelector('.footer__form-status');
    const footerButton = footerForm.querySelector('button[type="submit"]');
    const defaultFooterBtnText = footerButton?.textContent?.trim() || 'Request Demo';

    footerForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!footerForm.checkValidity()) {
        footerForm.reportValidity();
        return;
      }

      if (footerStatus) {
        footerStatus.textContent = '';
        footerStatus.classList.remove('is-success', 'is-error');
      }

      if (footerButton) {
        footerButton.disabled = true;
        footerButton.textContent = 'Sending...';
      }

      try {
        const formData = new FormData(footerForm);
        const response = await fetch(footerForm.action, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Footer form submission failed');
        }

        footerForm.reset();
        if (footerStatus) {
          footerStatus.textContent = 'Thanks! We’ll reach out shortly.';
          footerStatus.classList.add('is-success');
        }
        trackCta({ action: 'footer_demo_request', label: 'success' });
      } catch (error) {
        console.error(error);
        if (footerStatus) {
          footerStatus.textContent = 'Something went wrong. Please try again.';
          footerStatus.classList.add('is-error');
        }
        trackCta({ action: 'footer_demo_request', label: 'error' });
      } finally {
        if (footerButton) {
          footerButton.disabled = false;
          footerButton.textContent = defaultFooterBtnText;
        }
      }
    });
  }

  /* ---------- Contact form (Web3Forms) ---------- */
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    const statusEl = contactForm.querySelector('.contact-form__status');
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const defaultBtnText = submitButton?.textContent?.trim() || 'Send Message';

    contactForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        return;
      }

      statusEl.textContent = '';
      statusEl.classList.remove('is-success', 'is-error');

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
      }

      try {
        const formData = new FormData(contactForm);
        const response = await fetch(contactForm.action, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        contactForm.reset();
        statusEl.textContent = 'Thanks! We’ll get in touch shortly.';
        statusEl.classList.add('is-success');
        trackCta({ action: 'contact_form_submit', label: 'success' });
      } catch (error) {
        console.error(error);
        statusEl.textContent = 'Something went wrong. Please try again.';
        statusEl.classList.add('is-error');
        trackCta({ action: 'contact_form_submit', label: 'error' });
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = defaultBtnText;
        }
      }
    });
  }
});

type CTAOptions = {
  action: string;
  label?: string;
  value?: string | number;
};

const trackCta = ({ action, label = "", value = "" }: CTAOptions) => {
  const payload = {
    event: "cta_interaction",
    event_category: "CTA",
    event_action: action,
    event_label: label,
    event_value: value,
    timestamp: Date.now(),
  };

  const win = window as Window & { dataLayer?: unknown[] };
  if (Array.isArray(win.dataLayer)) {
    win.dataLayer.push(payload);
  } else {
    console.info("[Medula analytics]", payload);
  }
};

const createRipple = (event: PointerEvent) => {
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");
  ripple.className = "ripple-effect";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

  target.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
};

const updatePricing = (
  planAmounts: NodeListOf<HTMLElement>,
  planTerms: NodeListOf<HTMLElement>,
  isYearly: boolean
) => {
  planAmounts.forEach((amountEl) => {
    const monthly = amountEl.getAttribute("data-monthly");
    const yearly = amountEl.getAttribute("data-yearly");
    if (!monthly || !yearly) return;
    amountEl.textContent = isYearly ? yearly : monthly;
  });

  planTerms.forEach((termEl) => {
    termEl.textContent = isYearly ? "/mo billed yearly" : "/mo";
  });
};

export const initLandingInteractions = (root: HTMLElement) => {
  const cleanupFns: Array<() => void> = [];
  const body = document.body;

  const navToggle = root.querySelector<HTMLButtonElement>(".nav__toggle");
  const navLinksWrapper = root.querySelector<HTMLElement>(".nav__links-wrapper");
  const navLinks = root.querySelectorAll<HTMLAnchorElement>(".nav__links a");

  if (navToggle && navLinksWrapper) {
    const toggleNav = () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      navLinksWrapper.classList.toggle("is-active");
      body.classList.toggle("nav-open");
    };
    navToggle.addEventListener("click", toggleNav);
    cleanupFns.push(() => navToggle.removeEventListener("click", toggleNav));

    const closeNav = () => {
      navToggle.setAttribute("aria-expanded", "false");
      navLinksWrapper.classList.remove("is-active");
      body.classList.remove("nav-open");
    };
    navLinks.forEach((link) => {
      link.addEventListener("click", closeNav);
      cleanupFns.push(() => link.removeEventListener("click", closeNav));
    });
    cleanupFns.push(() => {
      body.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
      navLinksWrapper.classList.remove("is-active");
    });
  }

  const revealTargets = root.querySelectorAll<HTMLElement>(".reveal-on-scroll");
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealTargets.forEach((target) => observer.observe(target));
    cleanupFns.push(() => observer.disconnect());
  } else {
    revealTargets.forEach((target) => target.classList.add("is-visible"));
  }

  const rippleTargets = root.querySelectorAll<HTMLElement>(".js-ripple");
  rippleTargets.forEach((target) => {
    const handler = (event: PointerEvent) => createRipple(event);
    target.addEventListener("pointerdown", handler, { passive: true });
    cleanupFns.push(() => target.removeEventListener("pointerdown", handler));
  });

  const ctaButtons = root.querySelectorAll<HTMLElement>(".js-track-cta");
  ctaButtons.forEach((button) => {
    const handler = () => {
      const label = button.textContent?.trim() || "cta";
      trackCta({ action: "click", label });
    };
    button.addEventListener("click", handler);
    cleanupFns.push(() => button.removeEventListener("click", handler));
  });

  const billingToggle = root.querySelector<HTMLInputElement>("#billing-toggle");
  const planAmounts = root.querySelectorAll<HTMLElement>(
    ".plan-card__amount[data-monthly]"
  );
  const planTerms = root.querySelectorAll<HTMLElement>(".plan-card__term");

  if (billingToggle) {
    const handler = (event: Event) => {
      const isYearly = (event.target as HTMLInputElement).checked;
      updatePricing(planAmounts, planTerms, isYearly);
      trackCta({
        action: "toggle_pricing",
        label: isYearly ? "yearly" : "monthly",
      });
    };
    billingToggle.addEventListener("change", handler);
    cleanupFns.push(() => billingToggle.removeEventListener("change", handler));
  }

  const footerForm = root.querySelector<HTMLFormElement>(".footer__form");
  if (footerForm) {
    const footerStatus = footerForm.querySelector<HTMLElement>(".footer__form-status");
    const footerButton = footerForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    const defaultFooterBtnText = footerButton?.textContent?.trim() || "Request Demo";

    const submitFooter = async (event: SubmitEvent) => {
      event.preventDefault();
      if (!footerForm.checkValidity()) {
        footerForm.reportValidity();
        return;
      }

      if (footerStatus) {
        footerStatus.textContent = "";
        footerStatus.classList.remove("is-success", "is-error");
      }

      if (footerButton) {
        footerButton.disabled = true;
        footerButton.textContent = "Sending...";
      }

      try {
        const formData = new FormData(footerForm);
        const response = await fetch(footerForm.action, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Footer form submission failed");
        }

        footerForm.reset();
        if (footerStatus) {
          footerStatus.textContent = "Thanks! We’ll reach out shortly.";
          footerStatus.classList.add("is-success");
        }
        trackCta({ action: "footer_demo_request", label: "success" });
      } catch (error) {
        console.error(error);
        if (footerStatus) {
          footerStatus.textContent = "Something went wrong. Please try again.";
          footerStatus.classList.add("is-error");
        }
        trackCta({ action: "footer_demo_request", label: "error" });
      } finally {
        if (footerButton) {
          footerButton.disabled = false;
          footerButton.textContent = defaultFooterBtnText;
        }
      }
    };

    footerForm.addEventListener("submit", submitFooter);
    cleanupFns.push(() => footerForm.removeEventListener("submit", submitFooter));
  }

  const contactForm = root.querySelector<HTMLFormElement>(".contact-form");
  if (contactForm) {
    const statusEl = contactForm.querySelector<HTMLElement>(".contact-form__status");
    const submitButton = contactForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    const defaultBtnText = submitButton?.textContent?.trim() || "Send Message";

    const submitContact = async (event: SubmitEvent) => {
      event.preventDefault();
      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        return;
      }

      if (statusEl) {
        statusEl.textContent = "";
        statusEl.classList.remove("is-success", "is-error");
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      try {
        const formData = new FormData(contactForm);
        const response = await fetch(contactForm.action, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        contactForm.reset();
        if (statusEl) {
          statusEl.textContent = "Thanks! We’ll get in touch shortly.";
          statusEl.classList.add("is-success");
        }
        trackCta({ action: "contact_form_submit", label: "success" });
      } catch (error) {
        console.error(error);
        if (statusEl) {
          statusEl.textContent = "Something went wrong. Please try again.";
          statusEl.classList.add("is-error");
        }
        trackCta({ action: "contact_form_submit", label: "error" });
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = defaultBtnText;
        }
      }
    };

    contactForm.addEventListener("submit", submitContact);
    cleanupFns.push(() => contactForm.removeEventListener("submit", submitContact));
  }

  return () => {
    cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.error(error);
      }
    });
  };
};

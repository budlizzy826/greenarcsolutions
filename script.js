(() => {
    'use strict';

    // ===========================
    // Header scroll effect
    // ===========================
    const header = document.getElementById('header');
    let ticking = false;

    function onScroll() {
        if (!header) return;
        if (!ticking) {
            requestAnimationFrame(() => {
                header.classList.toggle('header-scrolled', window.scrollY > 80);
                ticking = false;
            });
            ticking = true;
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ===========================
    // Mobile nav toggle
    // ===========================
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (toggle && navLinks) {
        toggle.addEventListener('click', () => {
            const isOpen = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', !isOpen);
            navLinks.classList.toggle('nav-open');
            document.body.classList.toggle('no-scroll');
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('nav-open');
                toggle.setAttribute('aria-expanded', 'false');
                document.body.classList.remove('no-scroll');
            });
        });
    }

    // ===========================
    // Active section highlighting
    // ===========================
    const sections = document.querySelectorAll('section[id]');
    const navItems = document.querySelectorAll('.nav-links a');

    if (sections.length && navItems.length) {
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navItems.forEach(link => link.classList.remove('active'));
                    const activeLink = document.querySelector(
                        `.nav-links a[href="#${entry.target.id}"]`
                    );
                    if (activeLink) activeLink.classList.add('active');
                }
            });
        }, { rootMargin: '-40% 0px -60% 0px' });

        sections.forEach(section => sectionObserver.observe(section));
    }

    // ===========================
    // Scroll-triggered animations
    // ===========================
    const fadeElements = document.querySelectorAll('.fade-in');

    if (fadeElements.length) {
        const fadeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    fadeObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        fadeElements.forEach(el => fadeObserver.observe(el));
    }

    // ===========================
    // Contact form → same-origin relay (/api/lead → n8n)
    // ===========================
    function initContactForm(formId, statusId, sourcePage) {
        const form = document.getElementById(formId);
        const formStatus = document.getElementById(statusId);
        if (!form || !formStatus) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Sending...';
            formStatus.textContent = '';
            formStatus.className = 'form-status';

            const honeypot = form.querySelector('input[name="_gotcha"]');

            // Honeypot check — fake success to fool bots
            if (honeypot && honeypot.value) {
                formStatus.textContent = 'Thanks — your message is in. Adam will get back to you shortly.';
                formStatus.classList.add('form-success');
                form.reset();
                btn.disabled = false;
                btn.textContent = originalText;
                return;
            }

            try {
                const formData = new FormData(form);
                const smsConsent = form.querySelector('input[name="sms_consent"]')?.checked || false;

                const leadData = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone') || null,
                    company: formData.get('company') || null,
                    service_interest: formData.get('service') || null,
                    message: formData.get('message'),
                    source_page: sourcePage,
                    sms_consent: smsConsent,
                    consent_timestamp: new Date().toISOString(),
                    _gotcha: honeypot ? honeypot.value : ''
                };

                const res = await fetch('/api/lead', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(leadData)
                });

                if (!res.ok) throw new Error('Relay responded ' + res.status);

                formStatus.textContent = 'Thanks — your message is in. Adam will get back to you shortly.';
                formStatus.classList.add('form-success');
                form.reset();
            } catch (err) {
                console.error('Form submission error:', err);
                formStatus.textContent =
                    'Something went wrong. Please try again or email us directly at adam@greenarcsolutions.com.';
                formStatus.classList.add('form-error');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }

    initContactForm('contactForm', 'formStatus', 'homepage');
    initContactForm('aiContactForm', 'aiFormStatus', 'ai-assistants');

    // ===========================
    // Dynamic copyright year
    // ===========================
    const yearEl = document.getElementById('currentYear');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
})();

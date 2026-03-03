(() => {
    'use strict';

    // ===========================
    // Header scroll effect
    // ===========================
    const header = document.getElementById('header');
    let ticking = false;

    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(() => {
                header.classList.toggle('header-scrolled', window.scrollY > 80);
                ticking = false;
            });
            ticking = true;
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    // Run once on load in case page is already scrolled
    onScroll();

    // ===========================
    // Mobile nav toggle
    // ===========================
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    toggle.addEventListener('click', () => {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !isOpen);
        navLinks.classList.toggle('nav-open');
        document.body.classList.toggle('no-scroll');
    });

    // Close menu when a nav link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('nav-open');
            toggle.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('no-scroll');
        });
    });

    // ===========================
    // Active section highlighting
    // ===========================
    const sections = document.querySelectorAll('section[id]');
    const navItems = document.querySelectorAll('.nav-links a');

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
    }, {
        rootMargin: '-40% 0px -60% 0px'
    });

    sections.forEach(section => sectionObserver.observe(section));

    // ===========================
    // Scroll-triggered animations
    // ===========================
    const fadeElements = document.querySelectorAll('.fade-in');

    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                fadeObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15
    });

    fadeElements.forEach(el => fadeObserver.observe(el));

    // ===========================
    // Animated stat counters
    // ===========================
    const counters = document.querySelectorAll('.stat-number[data-target]');

    function animateCounter(el, target) {
        const duration = 2000;
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(target * eased);

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.target);
                animateCounter(entry.target, target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));

    // ===========================
    // Supabase initialization
    // ===========================
    let supabaseClient = null;
    let supabaseReady = false;

    async function initSupabase() {
        try {
            const res = await fetch('/api/config');
            if (!res.ok) throw new Error('Config fetch failed');
            const config = await res.json();

            if (!config.supabaseUrl || !config.supabaseAnonKey) {
                throw new Error('Missing Supabase config');
            }

            supabaseClient = window.supabase.createClient(
                config.supabaseUrl,
                config.supabaseAnonKey
            );
            supabaseReady = true;
        } catch (err) {
            console.error('Supabase init failed:', err);
        }
    }

    initSupabase();

    // ===========================
    // Contact form (Supabase)
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

            // Honeypot check — fake success to fool bots
            const honeypot = form.querySelector('input[name="_gotcha"]');
            if (honeypot && honeypot.value) {
                formStatus.textContent = 'Message sent! We\'ll be in touch soon.';
                formStatus.classList.add('form-success');
                form.reset();
                btn.disabled = false;
                btn.textContent = originalText;
                return;
            }

            if (!supabaseReady || !supabaseClient) {
                formStatus.textContent =
                    'Something went wrong. Please try again or email us directly.';
                formStatus.classList.add('form-error');
                btn.disabled = false;
                btn.textContent = originalText;
                return;
            }

            try {
                const formData = new FormData(form);
                const leadData = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone') || null,
                    company: formData.get('company') || null,
                    service_interest: formData.get('service') || null,
                    message: formData.get('message'),
                    source_page: sourcePage
                };

                const { error } = await supabaseClient
                    .from('leads')
                    .insert([leadData]);

                if (error) throw error;

                formStatus.textContent = 'Message sent! We\'ll be in touch soon.';
                formStatus.classList.add('form-success');
                form.reset();
            } catch (err) {
                console.error('Form submission error:', err);
                formStatus.textContent =
                    'Something went wrong. Please try again or email us directly.';
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

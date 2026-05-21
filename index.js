/* ============================================
   JAY BHARTI — PERSONAL PORTFOLIO
   Interactivity: Theme Toggle, Scroll Reveal, Nav
   ============================================ */

(function () {
  'use strict';

  // --- Theme Toggle ---
  const themeToggle = document.getElementById('themeToggle');
  const root = document.documentElement;
  const iconSun = themeToggle.querySelector('.icon-sun');
  const iconMoon = themeToggle.querySelector('.icon-moon');

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      iconSun.style.display = 'block';
      iconMoon.style.display = 'none';
    } else {
      iconSun.style.display = 'none';
      iconMoon.style.display = 'block';
    }
  }

  // Initialize theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = root.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  // --- Scroll Reveal ---
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Stagger the animation slightly for elements that appear together
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, index * 80);
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  revealElements.forEach((el) => revealObserver.observe(el));

  // --- Nav Scroll Effect ---
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    lastScroll = scrollY;
  }, { passive: true });

  // --- Mobile Menu Toggle ---
  const mobileToggle = document.getElementById('mobileToggle');
  const navLinks = document.getElementById('navLinks');

  mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  // Close mobile menu on link click
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
    });
  });

  // --- Smooth Scroll for Nav Links ---
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offset = 80; // nav height
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // --- Active Nav Link on Scroll ---
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navAnchors.forEach((a) => {
            a.style.color = '';
            if (a.getAttribute('href') === `#${id}`) {
              a.style.color = 'var(--text-primary)';
            }
          });
        }
      });
    },
    { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' }
  );

  sections.forEach((s) => sectionObserver.observe(s));

  // --- Project Carousels and Lightbox ---
  const carousels = document.querySelectorAll('.carousel');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox.querySelector('.lightbox-img');
  const lightboxCaption = lightbox.querySelector('.lightbox-caption');
  const lightboxClose = lightbox.querySelector('.lightbox-close');
  const lightboxPrev = lightbox.querySelector('.lightbox-arrow--left');
  const lightboxNext = lightbox.querySelector('.lightbox-arrow--right');

  let activeCarouselImages = [];
  let activeImageIndex = 0;
  let activeCarouselIndexCallback = null;

  // Initialize carousels
  carousels.forEach((carousel) => {
    const track = carousel.querySelector('.carousel-track');
    const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
    const prevBtn = carousel.querySelector('.carousel-arrow--left');
    const nextBtn = carousel.querySelector('.carousel-arrow--right');
    const dotsContainer = carousel.querySelector('.carousel-indicators');
    const dots = Array.from(dotsContainer.querySelectorAll('.carousel-dot'));
    
    let currentIndex = 0;

    function updateCarousel() {
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      
      slides.forEach((slide, idx) => {
        if (idx === currentIndex) {
          slide.classList.add('active');
        } else {
          slide.classList.remove('active');
        }
      });

      dots.forEach((dot, idx) => {
        if (idx === currentIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }

    carousel.goToSlide = function(index) {
      if (index < 0) {
        currentIndex = slides.length - 1;
      } else if (index >= slides.length) {
        currentIndex = 0;
      } else {
        currentIndex = index;
      }
      updateCarousel();
    };

    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      carousel.goToSlide(currentIndex - 1);
    });

    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      carousel.goToSlide(currentIndex + 1);
    });

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        carousel.goToSlide(idx);
      });
    });

    slides.forEach((slide, idx) => {
      const img = slide.querySelector('img');
      if (img) {
        img.addEventListener('click', () => {
          activeCarouselImages = slides.map(s => s.querySelector('img')).filter(Boolean);
          activeImageIndex = idx;
          activeCarouselIndexCallback = (newIndex) => {
            carousel.goToSlide(newIndex);
          };
          openLightbox();
        });
      }
    });
  });

  function openLightbox() {
    if (activeCarouselImages.length === 0) return;
    document.body.classList.add('body-lightbox-open');
    updateLightboxContent();
    lightbox.showModal();
  }

  function closeLightbox() {
    lightbox.close();
    document.body.classList.remove('body-lightbox-open');
  }

  function updateLightboxContent() {
    const currentImg = activeCarouselImages[activeImageIndex];
    if (!currentImg) return;
    
    lightboxImg.src = currentImg.src;
    lightboxImg.alt = currentImg.alt;
    lightboxCaption.textContent = currentImg.alt || '';

    if (activeCarouselImages.length <= 1) {
      lightboxPrev.style.display = 'none';
      lightboxNext.style.display = 'none';
    } else {
      lightboxPrev.style.display = 'flex';
      lightboxNext.style.display = 'flex';
    }
  }

  function navigateLightbox(direction) {
    if (activeCarouselImages.length <= 1) return;
    
    if (direction === 'next') {
      activeImageIndex = (activeImageIndex + 1) % activeCarouselImages.length;
    } else if (direction === 'prev') {
      activeImageIndex = (activeImageIndex - 1 + activeCarouselImages.length) % activeCarouselImages.length;
    }
    
    updateLightboxContent();
    
    if (typeof activeCarouselIndexCallback === 'function') {
      activeCarouselIndexCallback(activeImageIndex);
    }
  }

  lightboxPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    navigateLightbox('prev');
  });

  lightboxNext.addEventListener('click', (e) => {
    e.stopPropagation();
    navigateLightbox('next');
  });

  lightboxImg.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeCarouselImages.length > 1) {
      navigateLightbox('next');
    } else {
      closeLightbox();
    }
  });

  lightboxClose.addEventListener('click', () => {
    closeLightbox();
  });

  lightbox.addEventListener('close', () => {
    document.body.classList.remove('body-lightbox-open');
  });

  if (!('closedBy' in HTMLDialogElement.prototype)) {
    lightbox.addEventListener('click', (event) => {
      if (event.target !== lightbox) return;
      const rect = lightbox.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isDialogContent) {
        closeLightbox();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (!lightbox.open) return;
    
    if (e.key === 'ArrowRight') {
      navigateLightbox('next');
    } else if (e.key === 'ArrowLeft') {
      navigateLightbox('prev');
    }
  });

})();

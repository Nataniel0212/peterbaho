// ---------- Bildrutenummer i gallerier (t.ex. "07 / 25") ----------
document.querySelectorAll('.frames').forEach((container) => {
  const frames = container.querySelectorAll('.work');
  const total = String(frames.length).padStart(2, '0');
  frames.forEach((work, i) => {
    const cap = work.querySelector('figcaption');
    if (cap) cap.dataset.frame = `${String(i + 1).padStart(2, '0')} / ${total}`;
  });
});

// ---------- Header: mörk text när heron skrollats förbi ----------
const heroHeader = document.querySelector('.site-header.on-hero');
const hero = document.querySelector('.hero');

if (heroHeader && hero) {
  const updateHeader = () => {
    heroHeader.classList.toggle('scrolled', window.scrollY > hero.offsetHeight - 90);
  };
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
}

// ---------- Scrolldrivna animationer: parallax + herotext ----------
const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const parallaxFrames = Array.from(document.querySelectorAll('.work.full .frame'));
const heroText = document.querySelector('.hero-text');

if (motionOk && (parallaxFrames.length || heroText)) {
  let ticking = false;

  const updateScrollFx = () => {
    ticking = false;
    const vh = window.innerHeight;

    // Helbleed-bilder glider långsamt i sin ram
    parallaxFrames.forEach((frame) => {
      const rect = frame.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > vh + 100) return;
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      const img = frame.querySelector('img');
      img.style.transform = `scale(1.12) translateY(${(progress * -5).toFixed(2)}%)`;
    });

    // Herotexten tonar bort när man skrollar ned
    if (heroText && hero) {
      const y = window.scrollY;
      const range = hero.offsetHeight * 0.55;
      if (y < range + 200) {
        const t = Math.min(1, y / range);
        heroText.style.opacity = String(1 - t);
        heroText.style.transform = `translateY(${(t * 30).toFixed(1)}px)`;
      }
    }
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateScrollFx);
      }
    },
    { passive: true }
  );
  updateScrollFx();
}

// ---------- Scrollavslöjande ----------
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = document.querySelectorAll('.reveal');

if (prefersReducedMotion) {
  reveals.forEach((el) => el.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
  );
  reveals.forEach((el) => observer.observe(el));
}

// ---------- Katalog: kategoriflikar ----------
const tabs = document.querySelectorAll('.cat-tab');

function showCategory(cat) {
  tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.cat === cat)));
  document.querySelectorAll('.cat-gallery').forEach((gallery) => {
    gallery.hidden = gallery.id !== `cat-${cat}`;
  });
  history.replaceState(null, '', `#${cat}`);
}

if (tabs.length) {
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => showCategory(tab.dataset.cat));
  });

  const initial = location.hash.replace('#', '');
  if (initial && document.getElementById(`cat-${initial}`)) showCategory(initial);
}

// ---------- Lightbox med bläddring (inom samma galleri/sida) ----------
const lightbox = document.querySelector('.lightbox');

if (lightbox) {
  const lightboxImg = lightbox.querySelector('img');
  const lightboxCaption = lightbox.querySelector('.lightbox-caption');
  const btnClose = lightbox.querySelector('.lightbox-close');
  const btnPrev = lightbox.querySelector('.lightbox-prev');
  const btnNext = lightbox.querySelector('.lightbox-next');
  let works = [];
  let current = -1;
  let lastFocused = null;

  function visibleWorks(fromWork) {
    // bläddra bara bland bilder i samma galleri (eller hela sidan på framsidan)
    const gallery = fromWork.closest('.cat-gallery');
    const scope = gallery || document;
    return Array.from(scope.querySelectorAll('.work'));
  }

  function show(index) {
    current = (index + works.length) % works.length;
    const work = works[current];
    const img = work.querySelector('img');
    const cap = work.querySelector('figcaption');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = cap
      ? `${cap.dataset.frame || ''}  ${cap.textContent}`.trim()
      : '';
  }

  function openLightbox(work) {
    works = visibleWorks(work);
    lastFocused = document.activeElement;
    show(works.indexOf(work));
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    btnClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = '';
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  document.querySelectorAll('.work').forEach((work) => {
    work.addEventListener('click', () => openLightbox(work));
  });

  btnClose.addEventListener('click', closeLightbox);
  btnPrev.addEventListener('click', () => show(current - 1));
  btnNext.addEventListener('click', () => show(current + 1));

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
}

// ---------- Kontaktformulär: öppna mejlprogram med ifyllt innehåll ----------
const form = document.getElementById('contact-form');

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const subject = `Förfrågan: ${data.get('type')} — ${data.get('name')}`;
    const body = [
      `Namn: ${data.get('name')}`,
      `Mejl: ${data.get('email')}`,
      `Gäller: ${data.get('type')}`,
      '',
      String(data.get('message')),
    ].join('\n');
    window.location.href =
      `mailto:hej@peterbaho.se?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

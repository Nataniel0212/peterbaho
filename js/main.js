const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Helskärmsmeny (tre streck) ----------
const menuBtn = document.querySelector('.menu-btn');
const menu = document.querySelector('.menu');

if (menuBtn && menu) {
  const menuClose = menu.querySelector('.menu-close');

  function openMenu() {
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    menuClose.focus();
  }

  function closeMenu() {
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    menuBtn.focus();
  }

  menuBtn.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);

  // Länk i menyn: stäng den (hashbyte på samma sida laddar inte om sidan)
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) closeMenu();
  });
}

// ---------- Bildrutenummer i gallerier (t.ex. "07 / 25") ----------
document.querySelectorAll('.frames').forEach((container) => {
  const frames = container.querySelectorAll('.work');
  const total = String(frames.length).padStart(2, '0');
  frames.forEach((work, i) => {
    const cap = work.querySelector('figcaption');
    if (cap) cap.dataset.frame = `${String(i + 1).padStart(2, '0')} / ${total}`;
  });
});

// ---------- Scrollavslöjande ----------
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

// ---------- Parallax på helbleed-bilder ----------
const parallaxFrames = Array.from(document.querySelectorAll('.work.full .frame'));

if (!prefersReducedMotion && parallaxFrames.length) {
  let ticking = false;

  const updateParallax = () => {
    ticking = false;
    const vh = window.innerHeight;
    parallaxFrames.forEach((frame) => {
      const rect = frame.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > vh + 100) return;
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      const img = frame.querySelector('img');
      img.style.transform = `scale(1.12) translateY(${(progress * -5).toFixed(2)}%)`;
    });
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateParallax);
      }
    },
    { passive: true }
  );
  updateParallax();
}

// ---------- Katalog: kategori väljs via menyn (URL-hash) ----------
const catTitle = document.getElementById('cat-title');
const CAT_NAMES = {
  wedding: 'Wedding & Civil Marriage',
  event: 'Event',
  commercial: 'Commercial',
};

if (catTitle) {
  const switchPills = document.querySelectorAll('#cat-switch .cta');

  const showCategory = (cat) => {
    if (!CAT_NAMES[cat]) return;
    document.querySelectorAll('.cat-gallery').forEach((gallery) => {
      gallery.hidden = gallery.id !== `cat-${cat}`;
    });
    catTitle.textContent = CAT_NAMES[cat];
    switchPills.forEach((pill) => pill.classList.toggle('ghost', pill.dataset.cat !== cat));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const readHash = () => {
    const cat = location.hash.replace('#', '');
    if (CAT_NAMES[cat]) showCategory(cat);
  };

  window.addEventListener('hashchange', readHash);
  readHash();
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

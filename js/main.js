const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Intro: namnet visas, ridån dras uppåt (en gång per besök) ----------
const intro = document.querySelector('.intro');

if (intro) {
  let seen = false;
  try { seen = !!sessionStorage.getItem('introSeen'); } catch (e) {}

  if (prefersReducedMotion || seen) {
    intro.remove();
  } else {
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
    document.body.classList.add('has-intro');

    const inner = intro.querySelector('.intro-inner');
    const introName = intro.querySelector('.intro-name');
    const target = document.querySelector('.masthead-name');

    // Vänta in typsnittet innan vi mäter — annars mäts Georgia-fallbackens
    // bredd och namnet landar snett när Italiana swappar in.
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const leave = () => {
      // FLIP: mät hur långt namnet har kvar till sin plats i sidhuvudet och
      // flytta hela intro-inner dit, så att namn och underrubrik landar rätt.
      if (inner && introName && target) {
        const from = introName.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        // .masthead-name är ett block i full bredd — jämför mittpunkter i sidled,
        // annars blir förflyttningen hela gutterbredden fel.
        const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
        const dy = to.top - from.top;
        inner.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`;
      }
      document.body.classList.add('intro-leave');

      setTimeout(() => {
        intro.remove();
        document.body.classList.remove('has-intro', 'intro-leave');
      }, 950);
    };

    setTimeout(() => { fontsReady.then(leave); }, 1500);
  }
}

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
// #civil visar översikten; #civil/<par> visar hela parets album.
const catTitle = document.getElementById('cat-title');
const CAT_NAMES = {
  wedding: 'Wedding',
  civil: 'Civil Marriage',
  event: 'Event',
  commercial: 'Commercial',
  personal: 'Personal Projects',
};

if (catTitle) {
  const switchPills = document.querySelectorAll('#cat-switch .cta');

  const showSection = (sectionId, title, pillCat) => {
    const section = document.getElementById(sectionId);
    if (!section) return false;
    document.querySelectorAll('.cat-gallery').forEach((gallery) => {
      gallery.hidden = gallery.id !== sectionId;
    });
    catTitle.textContent = title;
    switchPills.forEach((pill) => pill.classList.toggle('ghost', pill.dataset.cat !== pillCat));
    window.scrollTo({ top: 0, behavior: 'auto' });
    // Nya sektioner kan ha oanimerade reveals — visa dem direkt
    section.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => el.classList.add('is-visible'));
    return true;
  };

  const readHash = () => {
    const hash = decodeURIComponent(location.hash.replace('#', ''));
    if (hash.startsWith('civil/')) {
      const slug = hash.slice('civil/'.length);
      const album = document.getElementById(`cat-civil-${slug}`);
      if (album && showSection(album.id, album.dataset.album || 'Civil Marriage', 'civil')) return;
    }
    if (CAT_NAMES[hash]) showSection(`cat-${hash}`, CAT_NAMES[hash], hash);
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
    return Array.from(scope.querySelectorAll('figure.work'));
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

  document.querySelectorAll('figure.work').forEach((work) => {
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
    const subject = `Förfrågan: ${data.get('type')} från ${data.get('name')}`;
    const body = [
      `Namn: ${data.get('name')}`,
      `Mejl: ${data.get('email')}`,
      `Gäller: ${data.get('type')}`,
      '',
      String(data.get('message')),
    ].join('\n');
    window.location.href =
      `mailto:peter-baho@outlook.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

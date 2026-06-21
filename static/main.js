/* ============================================
   Hugo Blog — Custom Scripts
   ============================================ */
(function () {
  'use strict';

  // === Code Copy Button + Language Label ===
  document.querySelectorAll('.highlight').forEach(function (block) {
    // Skip if already processed
    if (block.querySelector('.code-copy-btn')) return;

    var pre = block.querySelector('pre');
    if (!pre) return;

    // Language label
    var lang = '';
    var codeEl = pre.querySelector('code');
    if (codeEl) {
      var classes = codeEl.className || '';
      var m = classes.match(/language-([\w-]+)/);
      if (m) lang = m[1];
    }
    // Fallback: chroma class on .highlight
    if (!lang) {
      var hlClasses = block.className || '';
      var cm = hlClasses.match(/chroma[^ ]*-([\w-]+)/);
      if (cm) lang = cm[1];
    }
    if (lang) {
      var label = document.createElement('span');
      label.className = 'code-lang-label';
      label.textContent = lang;
      block.appendChild(label);
    }

    // Copy button
    var btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', function () {
      var text = pre.innerText;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = '✓ Copied';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1500);
      }).catch(function () {
        // Fallback
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btn.textContent = '✓ Copied';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1500);
      });
    });
    block.appendChild(btn);
  });

  // === Reading Progress Bar ===
  var progressBar = document.getElementById('reading-progress');
  if (progressBar) {
    var ticking = false;
    function updateProgress() {
      var scrollH = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var scrolled = window.scrollY / scrollH * 100;
      progressBar.style.width = scrolled + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(updateProgress);
        ticking = true;
      }
    }, { passive: true });
    updateProgress();
  }

  // === Back to Top ===
  var btnTop = document.getElementById('back-to-top');
  if (btnTop) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        btnTop.classList.add('visible');
      } else {
        btnTop.classList.remove('visible');
      }
    }, { passive: true });
    btnTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // === TOC Active Section Highlight ===
  var tocLinks = document.querySelectorAll('.table-of-contents nav a');
  if (tocLinks.length > 0) {
    var headings = [];
    tocLinks.forEach(function (link) {
      var id = link.getAttribute('href');
      if (id && id.startsWith('#')) {
        var heading = document.getElementById(id.slice(1));
        if (heading) headings.push({ el: heading, link: link });
      }
    });

    if (headings.length > 0) {
      var tickingTOC = false;
      function updateTOC() {
        var scrollPos = window.scrollY + 80;
        var current = null;
        for (var i = headings.length - 1; i >= 0; i--) {
          if (headings[i].el.offsetTop <= scrollPos) {
            current = headings[i];
            break;
          }
        }
        tocLinks.forEach(function (l) { l.classList.remove('toc-active'); });
        if (current) current.link.classList.add('toc-active');
        tickingTOC = false;
      }
      window.addEventListener('scroll', function () {
        if (!tickingTOC) {
          requestAnimationFrame(updateTOC);
          tickingTOC = true;
        }
      }, { passive: true });
      updateTOC();
    }
  }
})();

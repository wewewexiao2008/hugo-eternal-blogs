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

// === BlogHub: view stats + comments + accounts (own backend, replaces busuanzi/giscus, 2026-10-03) ===
(function () {
  'use strict';
  var meta = document.querySelector('meta[name="bloghub-base"]');
  var BASE = ((meta && meta.content) || '').replace(/\/+$/, '');
  if (!BASE) return;
  var isZh = location.pathname.indexOf('/zh-cn/') === 0;
  var T = isZh ? {
    login: '登录 / 注册后评论', post: '发表评论', posting: '发表中…',
    placeholder: '说点什么…', empty: '还没有评论，来抢沙发～', loadFail: '评论加载失败',
    logout: '退出', deleteC: '删除', confirmDel: '删除这条评论？', sentFail: '发送失败', admin: '（站长）'
  } : {
    login: 'Sign in to comment', post: 'Post comment', posting: 'Posting…',
    placeholder: 'Write a comment…', empty: 'No comments yet. Be the first!', loadFail: 'Failed to load comments',
    logout: 'Sign out', deleteC: 'Delete', confirmDel: 'Delete this comment?', sentFail: 'Failed to send', admin: ' (admin)'
  };
  var TOKEN_KEY = 'bloghub_token';
  var VID_KEY = 'bloghub_vid';

  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function visitorId() {
    try {
      var vid = localStorage.getItem(VID_KEY);
      if (vid && /^[A-Za-z0-9_-]{8,64}$/.test(vid)) return vid;
      var bytes = new Uint8Array(18);
      if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
      var s = btoa(String.fromCharCode.apply(null, bytes)).replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
      localStorage.setItem(VID_KEY, s);
      return s;
    } catch (e) { return 'anon-fallback-visitor'; }
  }
  function api(path, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    var tok = opts.token !== undefined ? opts.token : getToken();
    if (tok) headers['Authorization'] = 'Bearer ' + tok;
    return fetch(BASE + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) { var err = new Error(data.error || ('HTTP ' + res.status)); err.status = res.status; err.data = data; throw err; }
        return data; }); });
  }
  function fmtDate(ts) {
    try { return new Date(ts * 1000).toLocaleDateString(isZh ? 'zh-CN' : 'en-US'); } catch (e) { return ''; }
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // ---- page views ----
  var pvEls = document.querySelectorAll('.bloghub-pv');
  if (pvEls.length) {
    var postPath = pvEls[0].getAttribute('data-path') || location.pathname;
    api('/api/views/hit', { method: 'POST', body: { path: postPath, title: document.title.slice(0, 200), visitor_id: visitorId() } })
      .then(function (d) { document.querySelectorAll('.bloghub-pv').forEach(function (x) { x.textContent = d.pv; }); })
      .catch(function () { document.querySelectorAll('.bloghub-pv').forEach(function (x) { x.textContent = '—'; }); });
  }
  var siteEls = document.querySelectorAll('.bloghub-site-pv');
  if (siteEls.length) {
    api('/api/stats/site')
      .then(function (d) { siteEls.forEach(function (x) { x.textContent = d.pv; }); })
      .catch(function () { siteEls.forEach(function (x) { x.textContent = '—'; }); });
  }

  // ---- comments ----
  var root = document.getElementById('bloghub-comments');
  if (!root) return;
  var hint = document.querySelector('[data-bloghub-hint]');
  if (hint) hint.textContent = T.login;
  var pagePath = root.getAttribute('data-path') || location.pathname;

  function render(me) {
    root.innerHTML = '';
    api('/api/comments?path=' + encodeURIComponent(pagePath)).then(function (data) {
      var list = el('div', 'bloghub-comment-list');
      if (!data.comments.length) list.appendChild(el('p', 'bloghub-empty', T.empty));
      data.comments.forEach(function (c) {
        var row = el('div', 'bloghub-comment');
        var head = el('div', 'bloghub-comment-head');
        head.appendChild(el('strong', null, c.display_name + (c.role === 'admin' ? T.admin : '')));
        head.appendChild(el('span', 'bloghub-comment-date', ' ' + fmtDate(c.created_at)));
        if (me && (me.role === 'admin' || me.id === c.user_id)) {
          var del = el('button', 'bloghub-link danger', T.deleteC);
          del.type = 'button';
          del.addEventListener('click', function () {
            if (!confirm(T.confirmDel)) return;
            api('/api/comments/' + c.id, { method: 'DELETE' }).then(function () { render(me); }).catch(function () {});
          });
          head.appendChild(del);
        }
        row.appendChild(head);
        row.appendChild(el('div', 'bloghub-comment-body', c.body));
        list.appendChild(row);
      });
      root.appendChild(list);

      if (me) {
        var ta = el('textarea', 'bloghub-input');
        ta.placeholder = T.placeholder;
        ta.maxLength = 4000;
        ta.rows = 3;
        var btn = el('button', 'bloghub-btn', T.post);
        btn.type = 'button';
        var status = el('span', 'bloghub-status');
        btn.addEventListener('click', function () {
          var body = ta.value.trim();
          if (!body) return;
          btn.disabled = true; btn.textContent = T.posting;
          api('/api/comments', { method: 'POST', body: { path: pagePath, body: body } })
            .then(function () { ta.value = ''; status.textContent = ''; render(me); })
            .catch(function (err) { status.textContent = T.sentFail + ' (' + err.message + ')'; })
            .then(function () { btn.disabled = false; btn.textContent = T.post; });
        });
        var brow = el('div', 'bloghub-btnrow');
        brow.appendChild(btn);
        brow.appendChild(status);
        var logout = el('button', 'bloghub-link', T.logout);
        logout.type = 'button';
        logout.addEventListener('click', function () {
          api('/api/auth/logout', { method: 'POST' }).catch(function () {});
          setToken('');
          render(null);
        });
        brow.appendChild(logout);
        root.appendChild(ta);
        root.appendChild(brow);
      } else {
        var loginBtn = el('button', 'bloghub-btn', isZh ? '登录 / 注册' : 'Sign in');
        loginBtn.type = 'button';
        loginBtn.addEventListener('click', function () {
          window.open(BASE + '/?popup=1', 'bloghub-login', 'width=460,height=640');
        });
        root.appendChild(loginBtn);
      }
    }).catch(function () {
      root.appendChild(el('p', 'bloghub-empty', T.loadFail));
    });
  }

  window.addEventListener('message', function (ev) {
    if (ev.origin !== BASE) return;
    var d = ev.data || {};
    if (d.type === 'bloghub-auth' && d.token) {
      setToken(d.token);
      api('/api/auth/me').then(function (r) { render(r.user); }).catch(function () { render(null); });
    }
  });

  if (getToken()) {
    api('/api/auth/me').then(function (r) { render(r.user); }).catch(function () { setToken(''); render(null); });
  } else {
    render(null);
  }
})();

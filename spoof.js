  // ==UserScript==
  // @name         Twitter/X Live Spoofer v5.9 — True-original backup + Restore on OFF (names + counts) - FIXED
  // @namespace    http://tampermonkey.net/
  // @version      5.9
  // @description  Live spoof display name/handle/counts. Shift+S GUI (editable real values), Shift+U toggle. True-original backup for names AND counts, topbar fix, blacklist, title spoof, followers plural, continuous reapply.
  // @match        https://twitter.com/*
  // @match        https://x.com/*
  // @grant        none
  // ==/UserScript==

  (function () {
    'use strict';

    const LS_KEYS = {
      realDisplayName: 'x_spoof_real_display_name',
      spoofDisplayName: 'x_spoof_display_name',
      realHandle: 'x_spoof_real_handle',
      spoofHandle: 'x_spoof_handle',
      followers: 'x_spoof_followers',
      following: 'x_spoof_following',
      spoofEnabled: 'x_spoof_enabled',
      trueRealDisplayName: 'x_spoof_true_real_display_name',
      trueRealHandle: 'x_spoof_true_real_handle',
      trueRealFollowers: 'x_spoof_true_real_followers',  // NEW
      trueRealFollowing: 'x_spoof_true_real_following'   // NEW
    };

    // runtime cached values
    let REAL_DISPLAY_NAME = '';
    let REAL_HANDLE = '';
    let SPOOF_DISPLAY_NAME = '';
    let SPOOF_HANDLE = '';
    let SPOOF_FOLLOWERS = '9999';
    let SPOOF_FOLLOWING = '9999';
    let SPOOF_ENABLED = true;

    const HANDLE_TEXT_REGEX = /^@[\w_]{1,30}$/;
    const HANDLE_INPUT_REGEX = /^[\w_]{1,30}$/;

    // --- utils ---
    function isVisible(el) {
      if (!el) return false;
      try {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight);
      } catch {
        return false;
      }
    }

    function formatCount(n) {
      n = Number(n) || 0;
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1).replace(/\.0$/, '') + 'M';
      if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.0$/, '') + 'K';
      return String(n);
    }

    function replaceTextExact(node, oldText, newText) {
      if (!node || node.nodeType !== Node.TEXT_NODE) return false;
      if ((node.nodeValue || '').trim() === oldText) {
        node.nodeValue = node.nodeValue.replace(oldText, newText);
        return true;
      }
      return false;
    }

    // --- detection helpers ---
    function detectRealNameAndHandle() {
      const nodes = document.querySelectorAll('span,div,a,b,strong');
      for (const n of nodes) {
        const txt = (n.textContent || '').trim();
        if (!txt) continue;
        if (HANDLE_TEXT_REGEX.test(txt) && isVisible(n)) {
          const parent = n.parentElement;
          let display = '';
          if (parent) {
            const cand = Array.from(parent.querySelectorAll('span')).find(s =>
              (s !== n) && (s.textContent || '').trim().length && !HANDLE_TEXT_REGEX.test((s.textContent||'').trim()));
            if (cand) display = cand.textContent.trim();
          }
          return { display, handle: txt };
        }
      }
      return { display: '', handle: '' };
    }

    function detectRealCounts() {
      const counts = { followers: '', following: '' };
      const links = document.querySelectorAll('a[role="link"], a');
      for (const link of links) {
        if (!isVisible(link)) continue;
        const label = (link.textContent || '').toLowerCase();
        // try to locate numeric span(s)
        const numSpan = link.querySelector('span span') || link.querySelector('span');
        if (!numSpan) continue;
        const cleanNum = (numSpan.textContent || '').trim().replace(/[^\d]/g, '');
        if (!cleanNum) continue;
        if (label.includes('follower')) counts.followers = cleanNum;
        if (label.includes('following')) counts.following = cleanNum;
      }
      return counts;
    }

    function refreshRuntimeFromStorage() {
      REAL_DISPLAY_NAME = localStorage.getItem(LS_KEYS.realDisplayName) || REAL_DISPLAY_NAME;
      const rh = (localStorage.getItem(LS_KEYS.realHandle) || '').replace(/^@/, '');
      REAL_HANDLE = rh ? '@' + rh : REAL_HANDLE;
      SPOOF_DISPLAY_NAME = localStorage.getItem(LS_KEYS.spoofDisplayName) || SPOOF_DISPLAY_NAME;
      const sh = (localStorage.getItem(LS_KEYS.spoofHandle) || '').replace(/^@/, '');
      SPOOF_HANDLE = sh ? '@' + sh : SPOOF_HANDLE;
      SPOOF_FOLLOWERS = localStorage.getItem(LS_KEYS.followers) || SPOOF_FOLLOWERS;
      SPOOF_FOLLOWING = localStorage.getItem(LS_KEYS.following) || SPOOF_FOLLOWING;
      SPOOF_ENABLED = localStorage.getItem(LS_KEYS.spoofEnabled) !== 'false';
    }

    function saveSpoofEnabled(v) {
      SPOOF_ENABLED = v;
      localStorage.setItem(LS_KEYS.spoofEnabled, String(v));
    }

    // --- core replacements ---
    function applyNameHandleReplacement(root = document) {
      if (!root) return 0;
      let changed = 0;
      const candidates = root.querySelectorAll('span,div,a,b,strong');
      for (const el of candidates) {
        if (!isVisible(el)) continue;
        const text = (el.textContent || '').trim();
        if (!text) continue;

        if (SPOOF_ENABLED) {
          if (REAL_DISPLAY_NAME && text === REAL_DISPLAY_NAME) {
            for (const node of el.childNodes) if (replaceTextExact(node, REAL_DISPLAY_NAME, SPOOF_DISPLAY_NAME)) changed++;
          }
          if (REAL_HANDLE && text === REAL_HANDLE) {
            for (const node of el.childNodes) if (replaceTextExact(node, REAL_HANDLE, SPOOF_HANDLE)) changed++;
          }
        } else {
          if (SPOOF_DISPLAY_NAME && text === SPOOF_DISPLAY_NAME) {
            for (const node of el.childNodes) if (replaceTextExact(node, SPOOF_DISPLAY_NAME, REAL_DISPLAY_NAME)) changed++;
          }
          if (SPOOF_HANDLE && text === SPOOF_HANDLE) {
            for (const node of el.childNodes) if (replaceTextExact(node, SPOOF_HANDLE, REAL_HANDLE)) changed++;
          }
        }
      }
      return changed;
    }

    // --- counts with blacklist & pluralization ---
    function applyCountsReplacement(root = document) {
      if (!root) return 0;
      let changed = 0;
      const links = root.querySelectorAll('a[role="link"], a');
      for (const link of links) {
        if (!isVisible(link)) continue;

        // BLACKLIST: skip the specific unselected Home tab anchor that should remain numeric.
        try {
          const href = link.getAttribute && link.getAttribute('href');
          const role = link.getAttribute && link.getAttribute('role');
          const aria = link.getAttribute && link.getAttribute('aria-selected');
          if (href && href.startsWith('/home') && role === 'tab' && aria === 'false') continue;
        } catch {}

        const label = (link.textContent || '').toLowerCase();
        const numSpan = link.querySelector('span span') || link.querySelector('span');
        if (!numSpan || !isVisible(numSpan)) continue;

        if (label.includes('follower')) {
          // When spoof is enabled => show spoof value.
          // When spoof is disabled => prefer true-original value (stored), otherwise attempt detection/fallback.
          let targetCount = 0;
          if (SPOOF_ENABLED) {
            targetCount = Number(SPOOF_FOLLOWERS) || 0;
          } else {
            const storedTrue = localStorage.getItem(LS_KEYS.trueRealFollowers);
            if (storedTrue && /^\d+$/.test(storedTrue)) {
              targetCount = Number(storedTrue);
            } else {
              // Try to detect fresh from the DOM (best-effort) and save as true-original for future restores.
              const fresh = detectRealCounts();
              if (fresh.followers) {
                localStorage.setItem(LS_KEYS.trueRealFollowers, fresh.followers);
                targetCount = Number(fresh.followers);
              } else {
                // fallback to whatever numeric text is present
                targetCount = Number((numSpan.textContent || '').replace(/[^\d]/g, '')) || 0;
              }
            }
          }

          const fmt = formatCount(targetCount);
          if ((numSpan.textContent || '').trim() !== fmt) { numSpan.textContent = fmt; changed++; }

          // pluralization fix if there is a label node
          const spanList = link.querySelectorAll('span');
          if (spanList.length >= 2) {
            const labelNode = spanList[spanList.length - 1];
            const wanted = (targetCount === 0 || targetCount === 1) ? 'Follower' : 'Followers';
            if (labelNode && labelNode.textContent !== wanted) { labelNode.textContent = wanted; changed++; }
          }
          continue;
        }

        if (label.includes('following')) {
          let targetCount = 0;
          if (SPOOF_ENABLED) {
            targetCount = Number(SPOOF_FOLLOWING) || 0;
          } else {
            const storedTrue = localStorage.getItem(LS_KEYS.trueRealFollowing);
            if (storedTrue && /^\d+$/.test(storedTrue)) {
              targetCount = Number(storedTrue);
            } else {
              const fresh = detectRealCounts();
              if (fresh.following) {
                localStorage.setItem(LS_KEYS.trueRealFollowing, fresh.following);
                targetCount = Number(fresh.following);
              } else {
                targetCount = Number((numSpan.textContent || '').replace(/[^\d]/g, '')) || 0;
              }
            }
          }
          const fmt = formatCount(targetCount);
          if ((numSpan.textContent || '').trim() !== fmt) { numSpan.textContent = fmt; changed++; }
          continue;
        }
      }
      return changed;
    }

    // --- topbar: selected /home tab → "Following" if numeric; use stored orig for restore ---
    function fixTopbarFollowingLabels(root = document) {
      let changed = 0;
      try {
        const homeAnchor = root.querySelector('a[role="tab"][href^="/home"], a[role="tab"][href="/home"]');
        if (homeAnchor) {
          const span = homeAnchor.querySelector('span.css-1jxf684') || homeAnchor.querySelector('span');
          if (span && isVisible(span)) {
            const txt = (span.textContent || '').trim();
            if (/^\d+$/.test(txt)) {
              if (!span.hasAttribute('data-x-orig-text')) span.setAttribute('data-x-orig-text', txt);
              if (SPOOF_ENABLED) {
                if (span.textContent !== 'Following') { span.textContent = 'Following'; changed++; }
              } else {
                const orig = span.getAttribute('data-x-orig-text');
                if (orig && span.textContent !== orig) { span.textContent = orig; changed++; }
              }
            } else {
              if (!SPOOF_ENABLED && span.hasAttribute('data-x-orig-text')) {
                const orig = span.getAttribute('data-x-orig-text');
                if (orig && span.textContent !== orig) { span.textContent = orig; changed++; }
              }
            }
          }
        }
      } catch {}
      return changed;
    }

    // --- title spoofing (global) ---
    function spoofTitle() {
      try {
        let title = document.title || '';
        if (!title) return false;
        if (SPOOF_ENABLED) {
          if (REAL_DISPLAY_NAME && SPOOF_DISPLAY_NAME && title.includes(REAL_DISPLAY_NAME)) title = title.split(REAL_DISPLAY_NAME).join(SPOOF_DISPLAY_NAME);
          if (REAL_HANDLE && SPOOF_HANDLE && title.includes(REAL_HANDLE)) title = title.split(REAL_HANDLE).join(SPOOF_HANDLE);
        } else {
          if (SPOOF_DISPLAY_NAME && REAL_DISPLAY_NAME && title.includes(SPOOF_DISPLAY_NAME)) title = title.split(SPOOF_DISPLAY_NAME).join(REAL_DISPLAY_NAME);
          if (SPOOF_HANDLE && REAL_HANDLE && title.includes(SPOOF_HANDLE)) title = title.split(SPOOF_HANDLE).join(REAL_HANDLE);
        }
        if (document.title !== title) { document.title = title; return true; }
      } catch (e) { console.error('[SPOOF] spoofTitle error', e); }
      return false;
    }

    // --- runAll ---
    function runAll(root = document) {
      try {
        refreshRuntimeFromStorage();
        let total = 0;
        total += applyNameHandleReplacement(root);
        total += applyCountsReplacement(root);
        total += fixTopbarFollowingLabels(root);
        if (spoofTitle()) total++;
        // (silent) // if (total>0) console.log(`[SPOOF] applied ${total}`);
      } catch (e) { console.error('[SPOOF] runAll error', e); }
    }

    // --- GUI (editable real fields) ---
    function buildSettingsModal() {
      const existing = document.getElementById('x-spoof-settings-backdrop');
      if (existing) existing.remove();

      // re-detect (do NOT overwrite true-original backup here)
      const found = detectRealNameAndHandle();
      const detectedCounts = detectRealCounts();
      if (found.display && !localStorage.getItem(LS_KEYS.trueRealDisplayName)) localStorage.setItem(LS_KEYS.trueRealDisplayName, found.display);
      if (found.handle && !localStorage.getItem(LS_KEYS.trueRealHandle)) localStorage.setItem(LS_KEYS.trueRealHandle, found.handle.replace(/^@/,''));
      if (detectedCounts.followers && !localStorage.getItem(LS_KEYS.trueRealFollowers)) localStorage.setItem(LS_KEYS.trueRealFollowers, detectedCounts.followers);
      if (detectedCounts.following && !localStorage.getItem(LS_KEYS.trueRealFollowing)) localStorage.setItem(LS_KEYS.trueRealFollowing, detectedCounts.following);

      refreshRuntimeFromStorage();

      const backdrop = document.createElement('div');
      backdrop.id = 'x-spoof-settings-backdrop';
      Object.assign(backdrop.style, { position:'fixed', inset:'0', background:'rgba(0,0,0,0.45)', zIndex:'2147483647', display:'flex', alignItems:'center', justifyContent:'center' });

      const modal = document.createElement('div');
      Object.assign(modal.style, { background:'#0f1419', color:'#e7e9ea', minWidth:'320px', maxWidth:'720px', width:'92%', borderRadius:'12px', padding:'14px', boxShadow:'0 8px 24px rgba(0,0,0,0.35)' });

      modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <div style="font-weight:700;font-size:18px;">X Spoofer — Settings</div>
          <button id="xsp-close" style="background:transparent;border:none;color:#e7e9ea;font-size:18px;cursor:pointer;">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div><label style="font-size:13px;opacity:0.9;">Real display name (auto-detected)</label>
            <input id="xsp-real-display" value="${(REAL_DISPLAY_NAME||'').replace(/"/g,'&quot;')}" style="width:100%;padding:8px;border-radius:8px;border:1px solid #2f3336;background:#16181c;color:#e7e9ea;"></div>
          <div><label style="font-size:13px;opacity:0.9;">Real handle (without @) (auto-detected)</label>
            <input id="xsp-real-handle" value="${(REAL_HANDLE||'').replace(/^@/,'')}" style="width:100%;padding:8px;border-radius:8px;border:1px solid #2f3336;background:#16181c;color:#e7e9ea;"></div>
          <div><label style="font-size:13px;opacity:0.9;">Spoof display name</label>
            <input id="xsp-spoof-display" value="${(SPOOF_DISPLAY_NAME||'').replace(/"/g,'&quot;')}" style="width:100%;padding:8px;border-radius:8px;border:1px solid #2f3336;background:#16181c;color:#e7e9ea;"></div>
          <div><label style="font-size:13px;opacity:0.9;">Spoof handle (without @)</label>
            <input id="xsp-spoof-handle" value="${(SPOOF_HANDLE||'').replace(/^@/,'')}" style="width:100%;padding:8px;border-radius:8px;border:1px solid #2f3336;background:#16181c;color:#e7e9ea;"></div>
          <div><label style="font-size:13px;opacity:0.9;">Followers (raw number)</label>
            <input id="xsp-followers" type="number" value="${SPOOF_FOLLOWERS}" style="width:100%;padding:8px;border-radius:8px;border:1px solid #2f3336;background:#16181c;color:#e7e9ea;"></div>
          <div><label style="font-size:13px;opacity:0.9;">Following (raw number)</label>
            <input id="xsp-following" type="number" value="${SPOOF_FOLLOWING}" style="width:100%;padding:8px;border-radius:8px;border:1px solid #2f3336;background:#16181c;color:#e7e9ea;"></div>
        </div>
        <div id="xsp-error" style="color:#ff4d4f;min-height:18px;font-size:12px;margin-top:10px;"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px;">
          <button id="xsp-redetect" style="padding:8px 12px;border-radius:8px;border:1px solid #2f3336;background:#16181c;color:#e7e9ea;cursor:pointer;">Re-detect</button>
          <button id="xsp-cancel" style="padding:8px 12px;border-radius:8px;border:1px solid #2f3336;background:#16181c;color:#e7e9ea;cursor:pointer;">Cancel</button>
          <button id="xsp-save" style="padding:8px 12px;border-radius:8px;border:none;background:#1d9bf0;color:white;cursor:pointer;">Save</button>
        </div>
      `;

      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);

      const elClose = modal.querySelector('#xsp-close');
      const elCancel = modal.querySelector('#xsp-cancel');
      const elSave = modal.querySelector('#xsp-save');
      const elRedetect = modal.querySelector('#xsp-redetect');
      const elError = modal.querySelector('#xsp-error');

      function close() { backdrop.remove(); document.removeEventListener('keydown', onEsc); }
      function onEsc(e) { if (e.key === 'Escape') close(); }
      document.addEventListener('keydown', onEsc);

      elClose.onclick = close;
      elCancel.onclick = close;

      elRedetect.onclick = () => {
        const f = detectRealNameAndHandle();
        const c = detectRealCounts();
        if (f.display) modal.querySelector('#xsp-real-display').value = f.display;
        if (f.handle) modal.querySelector('#xsp-real-handle').value = f.handle.replace(/^@/,'');
        // set true-original backup if missing
        if (f.display && !localStorage.getItem(LS_KEYS.trueRealDisplayName)) localStorage.setItem(LS_KEYS.trueRealDisplayName, f.display);
        if (f.handle && !localStorage.getItem(LS_KEYS.trueRealHandle)) localStorage.setItem(LS_KEYS.trueRealHandle, f.handle.replace(/^@/,''));
        if (c.followers && !localStorage.getItem(LS_KEYS.trueRealFollowers)) localStorage.setItem(LS_KEYS.trueRealFollowers, c.followers);
        if (c.following && !localStorage.getItem(LS_KEYS.trueRealFollowing)) localStorage.setItem(LS_KEYS.trueRealFollowing, c.following);
      };

      elSave.onclick = () => {
        elError.textContent = '';
        const realDisplayVal = modal.querySelector('#xsp-real-display').value.trim();
        const realHandleVal = modal.querySelector('#xsp-real-handle').value.trim().replace(/^@/,'');
        const spoofDisplayVal = modal.querySelector('#xsp-spoof-display').value.trim();
        const spoofHandleVal = modal.querySelector('#xsp-spoof-handle').value.trim().replace(/^@/,'');
        const followersVal = modal.querySelector('#xsp-followers').value.trim();
        const followingVal = modal.querySelector('#xsp-following').value.trim();

        if (realHandleVal && !HANDLE_INPUT_REGEX.test(realHandleVal)) { elError.textContent = 'Invalid real handle (letters/numbers/underscores only).'; return; }
        if (spoofHandleVal && !HANDLE_INPUT_REGEX.test(spoofHandleVal)) { elError.textContent = 'Invalid spoof handle (letters/numbers/underscores only).'; return; }

        // save user-real values (editable by user)
        localStorage.setItem(LS_KEYS.realDisplayName, realDisplayVal);
        localStorage.setItem(LS_KEYS.realHandle, realHandleVal);
        // save spoof values
        localStorage.setItem(LS_KEYS.spoofDisplayName, spoofDisplayVal);
        localStorage.setItem(LS_KEYS.spoofHandle, spoofHandleVal);
        // save spoof counts (do NOT overwrite true-originals)
        localStorage.setItem(LS_KEYS.followers, String(Math.max(0, Number(followersVal || 0))));
        localStorage.setItem(LS_KEYS.following, String(Math.max(0, Number(followingVal || 0))));

        refreshRuntimeFromStorage();
        runAll();
        close();
      };
    }

    // --- shortcuts (with fresh re-detect on OFF using true-original backup if present) ---
    function bindShortcuts() {
      document.addEventListener('keydown', (e) => {
        if (!(e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey)) return;
        const key = (e.key || '').toLowerCase();
        if (key === 's') {
          if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) return;
          e.preventDefault();
          buildSettingsModal();
        } else if (key === 'u') {
          e.preventDefault();
          const newState = !SPOOF_ENABLED;
          saveSpoofEnabled(newState);

          if (!newState) {
            // turning spoof OFF -> prefer true-original backup if present (names)
            const trueDisplay = localStorage.getItem(LS_KEYS.trueRealDisplayName);
            const trueHandleRaw = localStorage.getItem(LS_KEYS.trueRealHandle);
            if (trueDisplay) localStorage.setItem(LS_KEYS.realDisplayName, trueDisplay);
            if (trueHandleRaw) localStorage.setItem(LS_KEYS.realHandle, trueHandleRaw);
            // For counts: ensure true-original backups exist (don't overwrite spoof values)
            const trueFollowers = localStorage.getItem(LS_KEYS.trueRealFollowers);
            const trueFollowing = localStorage.getItem(LS_KEYS.trueRealFollowing);
            if (!trueFollowers || !trueFollowing) {
              const freshCounts = detectRealCounts();
              if (freshCounts.followers) localStorage.setItem(LS_KEYS.trueRealFollowers, freshCounts.followers);
              if (freshCounts.following) localStorage.setItem(LS_KEYS.trueRealFollowing, freshCounts.following);
            }
            // If no true-original backup for names, attempt a fresh detection (may fail if DOM currently shows spoof)
            if (!trueDisplay || !trueHandleRaw) {
              const fresh = detectRealNameAndHandle();
              if (fresh.display) localStorage.setItem(LS_KEYS.realDisplayName, fresh.display);
              if (fresh.handle) localStorage.setItem(LS_KEYS.realHandle, fresh.handle.replace(/^@/,''));
            }
            refreshRuntimeFromStorage();
          } else {
            // turning spoof ON — don't change stored real values or true-originals
            refreshRuntimeFromStorage();
          }

          runAll();
          console.log(`[SPOOF] toggled ${SPOOF_ENABLED ? 'ON' : 'OFF'}`);
        }
      });
    }

    // --- bootstrap: initial detection and true-original backup if missing ---
    (function initialDetectAndStore() {
      const f = detectRealNameAndHandle();
      if (f.display && !localStorage.getItem(LS_KEYS.realDisplayName)) localStorage.setItem(LS_KEYS.realDisplayName, f.display);
      if (f.handle && !localStorage.getItem(LS_KEYS.realHandle)) localStorage.setItem(LS_KEYS.realHandle, f.handle.replace(/^@/,''));

      // store true-original backup for names if missing
      if (f.display && !localStorage.getItem(LS_KEYS.trueRealDisplayName)) localStorage.setItem(LS_KEYS.trueRealDisplayName, f.display);
      if (f.handle && !localStorage.getItem(LS_KEYS.trueRealHandle)) localStorage.setItem(LS_KEYS.trueRealHandle, f.handle.replace(/^@/,''));

      // detect & store true-original counts if missing
      const c = detectRealCounts();
      if (c.followers && !localStorage.getItem(LS_KEYS.trueRealFollowers)) localStorage.setItem(LS_KEYS.trueRealFollowers, c.followers);
      if (c.following && !localStorage.getItem(LS_KEYS.trueRealFollowing)) localStorage.setItem(LS_KEYS.trueRealFollowing, c.following);

      refreshRuntimeFromStorage();
    })();

    // initial apply + observers + continuous reapply
    runAll(document);
    new MutationObserver(m => m.forEach(rec => rec.addedNodes.forEach(node => { if (node.nodeType === 1) runAll(node); }))).observe(document.body, { childList:true, subtree:true });
    setInterval(() => runAll(document), 75);
    bindShortcuts();

    // helpers exposed for debugging
    window.__x_spoof = window.__x_spoof || {};
    window.__x_spoof.reapply = () => runAll(document);
    window.__x_spoof.refresh = () => { refreshRuntimeFromStorage(); runAll(document); };
    window.__x_spoof.detectNow = () => detectRealNameAndHandle();

    console.log('[X SPOOFER v5.9 FIXED] loaded — Shift+S settings, Shift+U toggle (OFF now restores names + counts).');
  })();

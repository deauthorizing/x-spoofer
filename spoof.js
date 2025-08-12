// ==UserScript==
// @name         cool x larp haha xd
// @namespace    http://tampermonkey.net/
// @version      6.2
// @description  fusi and wish made this hahhahhahahahahaha
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
    trueRealFollowers: 'x_spoof_true_real_followers',
    trueRealFollowing: 'x_spoof_true_real_following',
    fakeNameEnabled: 'x_spoof_fake_name_enabled',
    fakeHandleEnabled: 'x_spoof_fake_handle_enabled',
    fakeFollowersEnabled: 'x_spoof_fake_followers_enabled',
    fakeFollowingEnabled: 'x_spoof_fake_following_enabled'
  };

  let REAL_DISPLAY_NAME = '';
  let REAL_HANDLE = '';
  let SPOOF_DISPLAY_NAME = '';
  let SPOOF_HANDLE = '';
  let SPOOF_FOLLOWERS = '9999';
  let SPOOF_FOLLOWING = '9999';
  let SPOOF_ENABLED = true;
  let FAKE_NAME_ENABLED = false;
  let FAKE_HANDLE_ENABLED = false;
  let FAKE_FOLLOWERS_ENABLED = false;
  let FAKE_FOLLOWING_ENABLED = false;

  const HANDLE_TEXT_REGEX = /^@[\w_]{1,30}$/;
  const HANDLE_INPUT_REGEX = /^[\w_]{1,30}$/;

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
    SPOOF_ENABLED = localStorage.getItem(LS_KEYS.spoofEnabled) !== 'false' || localStorage.getItem(LS_KEYS.spoofEnabled) === null;
    FAKE_NAME_ENABLED = localStorage.getItem(LS_KEYS.fakeNameEnabled) === 'true';
    FAKE_HANDLE_ENABLED = localStorage.getItem(LS_KEYS.fakeHandleEnabled) === 'true';
    FAKE_FOLLOWERS_ENABLED = localStorage.getItem(LS_KEYS.fakeFollowersEnabled) === 'true';
    FAKE_FOLLOWING_ENABLED = localStorage.getItem(LS_KEYS.fakeFollowingEnabled) === 'true';
  }

  function saveSpoofEnabled(v) {
    SPOOF_ENABLED = v;
    localStorage.setItem(LS_KEYS.spoofEnabled, String(v));
  }

  function applyNameHandleReplacement(root = document) {
    if (!root) return 0;
    let changed = 0;
    const candidates = root.querySelectorAll('span,div,a,b,strong');
    for (const el of candidates) {
      if (!isVisible(el)) continue;
      const text = (el.textContent || '').trim();
      if (!text) continue;

      if (SPOOF_ENABLED) {
        if (FAKE_NAME_ENABLED && REAL_DISPLAY_NAME && text === REAL_DISPLAY_NAME) {
          for (const node of el.childNodes) if (replaceTextExact(node, REAL_DISPLAY_NAME, SPOOF_DISPLAY_NAME)) changed++;
        } else if (!FAKE_NAME_ENABLED && SPOOF_DISPLAY_NAME && text === SPOOF_DISPLAY_NAME) {
          for (const node of el.childNodes) if (replaceTextExact(node, SPOOF_DISPLAY_NAME, REAL_DISPLAY_NAME)) changed++;
        }

        if (FAKE_HANDLE_ENABLED && REAL_HANDLE && text === REAL_HANDLE) {
          for (const node of el.childNodes) if (replaceTextExact(node, REAL_HANDLE, SPOOF_HANDLE)) changed++;
        } else if (!FAKE_HANDLE_ENABLED && SPOOF_HANDLE && text === SPOOF_HANDLE) {
          for (const node of el.childNodes) if (replaceTextExact(node, SPOOF_HANDLE, REAL_HANDLE)) changed++;
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


  function applyCountsReplacement(root = document) {
    if (!root) return 0;
    let changed = 0;
    const links = root.querySelectorAll('a[role="link"], a');
    for (const link of links) {
      if (!isVisible(link)) continue;
      try {
        const href = link.getAttribute && link.getAttribute('href');
        const role = link.getAttribute && link.getAttribute('role');
        const aria = link.getAttribute && link.getAttribute('aria-selected');
        if (href && href.startsWith('/home') && role === 'tab' && aria === 'false') continue;
      } catch {}

      const label = (link.textContent || '').toLowerCase();
      const numSpan = link.querySelector('span span') || link.querySelector('span');
      if (!numSpan || !isVisible(numSpan)) continue;

      const restoreCount = (type) => {
        const trueKey = type === 'followers' ? LS_KEYS.trueRealFollowers : LS_KEYS.trueRealFollowing;
        const stored = localStorage.getItem(trueKey);
        if (stored && /^\d+$/.test(stored)) return Number(stored);
        const fresh = detectRealCounts();
        const val = fresh[type] || (numSpan.textContent || '').replace(/[^\d]/g, '');
        if (val) localStorage.setItem(trueKey, val);
        return Number(val) || 0;
      };

      if (label.includes('follower')) {
        let targetCount = 0;
        if (SPOOF_ENABLED) {
          if (FAKE_FOLLOWERS_ENABLED) targetCount = Number(SPOOF_FOLLOWERS) || 0;
          else targetCount = restoreCount('followers');
        } else {
          targetCount = restoreCount('followers');
        }
        const fmt = formatCount(targetCount);
        if ((numSpan.textContent || '').trim() !== fmt) { numSpan.textContent = fmt; changed++; }

        const spanList = link.querySelectorAll('span');
        if (spanList.length >= 2) {
          const labelNode = spanList[spanList.length - 1];
          const wanted = (targetCount === 1) ? 'Follower' : 'Followers';
          if (labelNode && labelNode.textContent !== wanted) { labelNode.textContent = wanted; changed++; }
        }
        continue;
      }

      if (label.includes('following')) {
        let targetCount = 0;
        if (SPOOF_ENABLED) {
          if (FAKE_FOLLOWING_ENABLED) targetCount = Number(SPOOF_FOLLOWING) || 0;
          else targetCount = restoreCount('following');
        } else {
          targetCount = restoreCount('following');
        }
        const fmt = formatCount(targetCount);
        if ((numSpan.textContent || '').trim() !== fmt) { numSpan.textContent = fmt; changed++; }
        continue;
      }
    }
    return changed;
  }


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

  function spoofTitle() {
    try {
      let title = document.title || '';
      if (!title) return false;
      if (SPOOF_ENABLED) {
        if (FAKE_NAME_ENABLED && REAL_DISPLAY_NAME && SPOOF_DISPLAY_NAME && title.includes(REAL_DISPLAY_NAME)) title = title.split(REAL_DISPLAY_NAME).join(SPOOF_DISPLAY_NAME);
        if (FAKE_HANDLE_ENABLED && REAL_HANDLE && SPOOF_HANDLE && title.includes(REAL_HANDLE)) title = title.split(REAL_HANDLE).join(SPOOF_HANDLE);
      } else {
        if (SPOOF_DISPLAY_NAME && REAL_DISPLAY_NAME && title.includes(SPOOF_DISPLAY_NAME)) title = title.split(SPOOF_DISPLAY_NAME).join(REAL_DISPLAY_NAME);
        if (SPOOF_HANDLE && REAL_HANDLE && title.includes(SPOOF_HANDLE)) title = title.split(SPOOF_HANDLE).join(REAL_HANDLE);
      }
      if (document.title !== title) { document.title = title; return true; }
    } catch (e) { console.error('[SPOOF] spoofTitle error', e); }
    return false;
  }

  function runAll(root = document) {
    try {
      refreshRuntimeFromStorage();
      let total = 0;
      total += applyNameHandleReplacement(root);
      total += applyCountsReplacement(root);
      total += fixTopbarFollowingLabels(root);
      if (spoofTitle()) total++;
    } catch (e) { console.error('[SPOOF] runAll error', e); }
  }

  function buildSettingsModal() {
    const existing = document.getElementById('x-spoof-settings-backdrop');
    if (existing) existing.remove();

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
      <div style="grid-column:1 / -1;display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
        <label style="font-size:13px;opacity:0.95;"><input type="checkbox" id="xsp-fake-name" style="margin-right:6px;">Spoof display name</label>
        <label style="font-size:13px;opacity:0.95;"><input type="checkbox" id="xsp-fake-handle" style="margin-right:6px;">Spoof handle</label>
        <label style="font-size:13px;opacity:0.95;"><input type="checkbox" id="xsp-fake-followers" style="margin-right:6px;">Spoof followers</label>
        <label style="font-size:13px;opacity:0.95;"><input type="checkbox" id="xsp-fake-following" style="margin-right:6px;">Spoof following</label>
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

    try {
      const cbName = modal.querySelector('#xsp-fake-name');
      const cbHandle = modal.querySelector('#xsp-fake-handle');
      const cbFollowers = modal.querySelector('#xsp-fake-followers');
      const cbFollowing = modal.querySelector('#xsp-fake-following');
      if (cbName) cbName.checked = FAKE_NAME_ENABLED;
      if (cbHandle) cbHandle.checked = FAKE_HANDLE_ENABLED;
      if (cbFollowers) cbFollowers.checked = FAKE_FOLLOWERS_ENABLED;
      if (cbFollowing) cbFollowing.checked = FAKE_FOLLOWING_ENABLED;
    } catch(e) { console.error('checkbox setup error', e); }

    try {
      const bindLiveCheckbox = (selector, lsKey, assignFlag) => {
        const checkbox = modal.querySelector(selector);
        if (!checkbox) return;
        checkbox.addEventListener('change', () => {
          try {
            const val = !!checkbox.checked;
            localStorage.setItem(lsKey, String(val));
            if (typeof assignFlag === 'function') assignFlag(val);
            refreshRuntimeFromStorage();
            applyNameHandleReplacement(document);
            spoofTitle();
            runAll(document);
} catch (err) { console.error('live checkbox handler error', err); }
        });
      };
      bindLiveCheckbox('#xsp-fake-name', LS_KEYS.fakeNameEnabled, v => { FAKE_NAME_ENABLED = v; });
      bindLiveCheckbox('#xsp-fake-handle', LS_KEYS.fakeHandleEnabled, v => { FAKE_HANDLE_ENABLED = v; });
      bindLiveCheckbox('#xsp-fake-followers', LS_KEYS.fakeFollowersEnabled, v => { FAKE_FOLLOWERS_ENABLED = v; });
      bindLiveCheckbox('#xsp-fake-following', LS_KEYS.fakeFollowingEnabled, v => { FAKE_FOLLOWING_ENABLED = v; });
    } catch (e) { console.error('bind live checkboxes error', e); }

    elRedetect.onclick = () => {
      const f = detectRealNameAndHandle();
      const c = detectRealCounts();
      if (f.display) modal.querySelector('#xsp-real-display').value = f.display;
      if (f.handle) modal.querySelector('#xsp-real-handle').value = f.handle.replace(/^@/,'');
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

      localStorage.setItem(LS_KEYS.realDisplayName, realDisplayVal);
      localStorage.setItem(LS_KEYS.realHandle, realHandleVal);
      localStorage.setItem(LS_KEYS.spoofDisplayName, spoofDisplayVal);
      localStorage.setItem(LS_KEYS.spoofHandle, spoofHandleVal);
      localStorage.setItem(LS_KEYS.followers, String(Math.max(0, Number(followersVal || 0))));
      localStorage.setItem(LS_KEYS.following, String(Math.max(0, Number(followingVal || 0))));
      localStorage.setItem(LS_KEYS.fakeNameEnabled, String(!!modal.querySelector('#xsp-fake-name').checked));
      localStorage.setItem(LS_KEYS.fakeHandleEnabled, String(!!modal.querySelector('#xsp-fake-handle').checked));
      localStorage.setItem(LS_KEYS.fakeFollowersEnabled, String(!!modal.querySelector('#xsp-fake-followers').checked));
      localStorage.setItem(LS_KEYS.fakeFollowingEnabled, String(!!modal.querySelector('#xsp-fake-following').checked));

      refreshRuntimeFromStorage();
      runAll();
      close();
    };
  }

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
          const trueDisplay = localStorage.getItem(LS_KEYS.trueRealDisplayName);
          const trueHandleRaw = localStorage.getItem(LS_KEYS.trueRealHandle);
          if (trueDisplay) localStorage.setItem(LS_KEYS.realDisplayName, trueDisplay);
          if (trueHandleRaw) localStorage.setItem(LS_KEYS.realHandle, trueHandleRaw);
          const trueFollowers = localStorage.getItem(LS_KEYS.trueRealFollowers);
          const trueFollowing = localStorage.getItem(LS_KEYS.trueRealFollowing);
          if (!trueFollowers || !trueFollowing) {
            const freshCounts = detectRealCounts();
            if (freshCounts.followers) localStorage.setItem(LS_KEYS.trueRealFollowers, freshCounts.followers);
            if (freshCounts.following) localStorage.setItem(LS_KEYS.trueRealFollowing, freshCounts.following);
          }
          if (!trueDisplay || !trueHandleRaw) {
            const fresh = detectRealNameAndHandle();
            if (fresh.display) localStorage.setItem(LS_KEYS.realDisplayName, fresh.display);
            if (fresh.handle) localStorage.setItem(LS_KEYS.realHandle, fresh.handle.replace(/^@/,''));
          }
          refreshRuntimeFromStorage();
        } else {
          refreshRuntimeFromStorage();
        }

        runAll();
        console.log(`[SPOOF] toggled ${SPOOF_ENABLED ? 'ON' : 'OFF'}`);
      }
    });
  }

  (function initialDetectAndStore() {
    const f = detectRealNameAndHandle();
    if (f.display && !localStorage.getItem(LS_KEYS.realDisplayName)) localStorage.setItem(LS_KEYS.realDisplayName, f.display);
    if (f.handle && !localStorage.getItem(LS_KEYS.realHandle)) localStorage.setItem(LS_KEYS.realHandle, f.handle.replace(/^@/,''));

    if (f.display && !localStorage.getItem(LS_KEYS.trueRealDisplayName)) localStorage.setItem(LS_KEYS.trueRealDisplayName, f.display);
    if (f.handle && !localStorage.getItem(LS_KEYS.trueRealHandle)) localStorage.setItem(LS_KEYS.trueRealHandle, f.handle.replace(/^@/,''));

    const c = detectRealCounts();
    if (c.followers && !localStorage.getItem(LS_KEYS.trueRealFollowers)) localStorage.setItem(LS_KEYS.trueRealFollowers, c.followers);
    if (c.following && !localStorage.getItem(LS_KEYS.trueRealFollowing)) localStorage.setItem(LS_KEYS.trueRealFollowing, c.following);

    refreshRuntimeFromStorage();
  })();

  runAll(document);
          spoofTitle();
new MutationObserver(m => m.forEach(rec => rec.addedNodes.forEach(node => { if (node.nodeType === 1) runAll(node); }))).observe(document.body, { childList:true, subtree:true });
  setInterval(() => runAll(document), 75);
  bindShortcuts();

  window.__x_spoof = window.__x_spoof || {};
  window.__x_spoof.reapply = () => runAll(document);
          spoofTitle();
window.__x_spoof.refresh = () => { refreshRuntimeFromStorage();
            applyNameHandleReplacement(document);
            spoofTitle();
            runAll(document);
};
  window.__x_spoof.detectNow = () => detectRealNameAndHandle();

  console.log('[X SPOOFER v6.2] loaded — Shift+S settings, Shift+U toggle (checkboxes live-apply). made by wish and fusi with love 💓');
})();

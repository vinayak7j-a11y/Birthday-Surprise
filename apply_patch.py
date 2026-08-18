import sys

def patch(path, replacements):
    with open(path, encoding="utf-8") as f:
        content = f.read()
    for old, new in replacements:
        n = content.count(old)
        if n != 1:
            print(f"SKIPPED a block in {path} (found {n} matches, expected 1) — that section may already be patched or has diverged. Check manually.")
            continue
        content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"patched {path}")

patch("index.html", [
    ('    <p class="eyebrow" id="balloonsEyebrow">for good measure</p>\n'
     '    <h2 class="section-title" id="balloonsTitle">Pop a few, why not</h2>\n'
     '    <div id="balloonField" class="balloon-field"></div>',
     '    <p class="eyebrow" id="balloonsEyebrow">for good measure</p>\n'
     '    <h2 class="section-title" id="balloonsTitle">Pop a few, why not</h2>\n'
     '    <div id="balloonCounter" class="balloon-counter">0/6 popped</div>\n'
     '    <div id="balloonWords" class="balloon-words" aria-live="polite"></div>\n'
     '    <div id="balloonField" class="balloon-field"></div>'),

    ('    <button id="restartBtn" class="btn-ghost restart-btn" type="button"><span>watch it again</span></button>\n'
     '    <p class="fine-print" id="footerNote">made with care, one candle at a time</p>',
     '    <button id="restartBtn" class="btn-ghost restart-btn" type="button"><span>watch it again</span></button>\n'
     '    <p class="fine-print" id="footerNote">made with care, one candle at a time</p>\n'
     '    <p class="fine-print"><a href="create.html" class="make-one-link">make one for someone else →</a></p>'),
])

patch("style.css", [
    ('.balloon-field{\n'
     '  position: relative;\n'
     '  width: min(100%, 34rem);\n'
     '  height: 380px;\n'
     '}',
     '.balloon-field{\n'
     '  position: relative;\n'
     '  width: min(100%, 34rem);\n'
     '  height: 380px;\n'
     '}\n'
     '.balloon-counter{\n'
     '  position: absolute; top: 0; right: 0;\n'
     '  background: rgba(255,255,255,0.08);\n'
     '  border: 1px solid rgba(216,180,99,0.3);\n'
     '  border-radius: 999px;\n'
     '  padding: 0.35rem 0.9rem;\n'
     '  font-size: 0.72rem; letter-spacing: 0.05em; text-transform: uppercase;\n'
     '  color: var(--gold);\n'
     '}\n'
     '.balloon-words{\n'
     '  min-height: 1.6em;\n'
     '  font-family: var(--serif); font-style: italic; font-size: 1.15rem;\n'
     '  color: var(--paper);\n'
     '  margin-bottom: var(--space-2);\n'
     '  display: flex; gap: 0.4em; flex-wrap: wrap; justify-content: center;\n'
     '}\n'
     '.balloon-word{ opacity: 0; animation: wordIn 0.5s var(--ease) forwards; }\n'
     '@keyframes wordIn{\n'
     '  from{ opacity: 0; transform: translateY(6px); }\n'
     '  to{ opacity: 1; transform: translateY(0); }\n'
     '}\n'
     '.make-one-link{ color: var(--mist); text-decoration: underline; text-underline-offset: 3px; }\n'
     '.make-one-link:hover{ color: var(--gold); }'),
])

print("Done. Review with `git diff` before committing.")

// Встраиваемый в HTML-выгрузку набор для проверки преподавателем.
// Обычный JS без зависимостей: зачёркивание ответов, текстовые исправления,
// рукописные пометки (стилус, мышь, палец) на холсте поверх страницы, сохранение
// проверенного файла. Состояние хранится в <script id="review" type="application/json">.

export const REVIEW_KIT_CSS = `
  body { padding-top: 64px; position: relative; }
  #rk-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 20; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px 14px; background: #fff; border-bottom: 2px solid #b3171c; font-size: 14px; line-height: 1.4; box-shadow: 0 1px 6px rgba(0,0,0,.12); }
  #rk-bar b { color: #b3171c; margin-right: 6px; }
  #rk-bar button { font: inherit; padding: 5px 10px; border: 1px solid #bbb; border-radius: 6px; background: #fff; cursor: pointer; }
  #rk-bar button.on { background: #b3171c; border-color: #b3171c; color: #fff; }
  #rk-bar button.save { background: #1a3a8a; border-color: #1a3a8a; color: #fff; font-weight: 600; }
  #rk-bar .sp { flex: 1; }
  #rk-bar .status { color: #1a7a1a; font-weight: 600; }
  #rk-bar input[type=color] { width: 28px; height: 28px; border: none; background: none; padding: 0; cursor: pointer; }
  [data-key] { cursor: pointer; position: relative; }
  [data-key].rk-wrong { text-decoration: line-through; text-decoration-color: #c00; text-decoration-thickness: 3px; background: #ffd6d6; color: #600; }
  .rk-fix { display: inline-block; min-width: 1ch; margin-left: 6px; padding: 0 8px; border-bottom: 2px solid #1a7a1a; color: #1a7a1a; font-weight: 700; outline: none; }
  .rk-fix:empty:not(:focus) { display: none; }
  [data-key].rk-wrong + .rk-fix:empty:not(:focus), [data-key].rk-sel + .rk-fix:empty:not(:focus) { display: inline-block; min-width: 90px; }
  .rk-fix:empty:before { content: attr(data-ph); color: #9bb; font-weight: 400; }
  .rk-fix:focus:before { content: ''; }
  #rk-comment-box { margin: 30px 0 20px; }
  #rk-comment-box label { display: block; font-weight: 600; color: #1a7a1a; margin-bottom: 4px; }
  #rk-comment { width: 100%; min-height: 90px; font: inherit; font-size: 17px; line-height: 1.5; padding: 8px 10px; border: 1px solid #999; border-radius: 6px; box-sizing: border-box; }
  #rk-ink { position: absolute; top: 0; left: 0; pointer-events: none; z-index: 10; touch-action: none; }
  body.rk-draw #rk-ink { pointer-events: auto; cursor: crosshair; }
  body.rk-draw [data-key] { cursor: default; }
  #rk-space { height: 320px; border-top: 1px dashed #ccc; margin-top: 20px; color: #aaa; font-size: 13px; padding-top: 6px; }
  .rk-hint { color: #666; font-size: 13px; }
  @media print { #rk-bar { display: none; } body { padding-top: 0; } }
`

export const REVIEW_KIT_JS = `
(function () {
  'use strict'
  var slot = document.getElementById('review')
  var S = { marks: {}, comment: '', ink: null, inkW: 0, inkH: 0, checkedAt: null }
  try { if (slot && slot.textContent.trim()) S = Object.assign(S, JSON.parse(slot.textContent)) } catch (e) {}
  var drawMode = false, tool = 'pen', color = '#d01010', penSeen = false
  var undo = []

  function el(tag, attrs, html) {
    var n = document.createElement(tag)
    for (var k in attrs) n.setAttribute(k, attrs[k])
    if (html != null) n.innerHTML = html
    return n
  }

  // ---- панель
  var bar = el('div', { id: 'rk-bar', class: 'rk-runtime' })
  bar.innerHTML =
    '<b>Проверка</b>' +
    '<span class="rk-hint">Нажмите на ответ, чтобы зачеркнуть и вписать исправление.</span>' +
    '<button id="rk-pen" title="Рисовать поверх страницы (стилус, мышь, палец)">✎ Ручка</button>' +
    '<button id="rk-eraser" title="Стирать">◌ Ластик</button>' +
    '<input type="color" id="rk-color" value="#d01010" title="Цвет ручки">' +
    '<button id="rk-undo" title="Отменить последний штрих">↶</button>' +
    '<button id="rk-clear" title="Стереть все рукописные пометки">Очистить рисунок</button>' +
    '<span class="sp"></span>' +
    '<span class="status" id="rk-status"></span>' +
    '<button class="save" id="rk-save">Сохранить проверку</button>'
  document.body.prepend(bar)
  function pad() { document.body.style.paddingTop = bar.offsetHeight + 14 + 'px' }
  pad()
  window.addEventListener('resize', pad)
  var status = bar.querySelector('#rk-status')
  if (S.checkedAt) status.textContent = 'Проверено ' + new Date(S.checkedAt).toLocaleString('ru-RU')

  // ---- отметки на ответах
  var keyed = Array.prototype.slice.call(document.querySelectorAll('[data-key]'))
  keyed.forEach(function (a) {
    var key = a.getAttribute('data-key')
    var fix = el('span', { class: 'rk-fix rk-runtime', contenteditable: 'true', 'data-ph': 'исправление', spellcheck: 'false' })
    a.after(fix)
    var m = S.marks[key]
    if (m) { if (m.wrong) a.classList.add('rk-wrong'); if (m.fix) fix.textContent = m.fix }
    a.addEventListener('click', function () {
      if (drawMode) return
      if (a.classList.contains('empty')) { a.classList.toggle('rk-sel'); if (a.classList.contains('rk-sel')) fix.focus(); return }
      a.classList.toggle('rk-wrong')
      if (a.classList.contains('rk-wrong')) fix.focus()
    })
    fix.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); fix.blur() } })
  })

  // ---- комментарий и место для рукописных заметок
  var box = el('div', { id: 'rk-comment-box', class: 'rk-runtime' }, '<label for="rk-comment">Комментарий преподавателя</label>')
  var cm = el('textarea', { id: 'rk-comment', placeholder: 'Что исправить, на что обратить внимание…' })
  cm.value = S.comment || ''
  box.appendChild(cm)
  document.body.appendChild(box)
  document.body.appendChild(el('div', { id: 'rk-space', class: 'rk-runtime' }, 'Место для рукописных заметок'))

  // ---- холст
  var cv = el('canvas', { id: 'rk-ink', class: 'rk-runtime' })
  document.body.appendChild(cv)
  var ctx = cv.getContext ? cv.getContext('2d') : null
  function fit() {
    if (!ctx) return
    var w = document.documentElement.scrollWidth
    var h = Math.max(document.documentElement.scrollHeight, S.inkH || 0)
    if (cv.width === w && cv.height === h) return
    var keep = null
    if (cv.width && cv.height) { keep = document.createElement('canvas'); keep.width = cv.width; keep.height = cv.height; keep.getContext('2d').drawImage(cv, 0, 0) }
    cv.width = w; cv.height = h; cv.style.width = w + 'px'; cv.style.height = h + 'px'
    if (keep) ctx.drawImage(keep, 0, 0)
  }
  fit()
  if (S.ink) { var img = new Image(); img.onload = function () { fit(); ctx.drawImage(img, 0, 0) }; img.src = S.ink }
  window.addEventListener('resize', fit)
  cm.addEventListener('input', fit)

  var drawing = false, last = null
  function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure || 0.5 } }
  function width(p) { return tool === 'eraser' ? 26 : 1.2 + p * 4 }
  cv.addEventListener('pointerdown', function (e) {
    if (!drawMode || !ctx) return
    if (e.pointerType === 'pen') penSeen = true
    if (e.pointerType === 'touch' && penSeen) return // ладонь при работе стилусом
    e.preventDefault()
    try { undo.push(ctx.getImageData(0, 0, cv.width, cv.height)); if (undo.length > 40) undo.shift() } catch (err) {}
    drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId)
    ctx.beginPath(); ctx.arc(last.x, last.y, width(last.p) / 2, 0, 6.3); ctx.fillStyle = color
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'; ctx.fill()
  })
  cv.addEventListener('pointermove', function (e) {
    if (!drawing || !ctx) return
    var pts = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    pts.forEach(function (pe) {
      var q = pos(pe)
      ctx.lineWidth = width(q.p); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(q.x, q.y); ctx.stroke(); last = q
    })
  })
  function up() { drawing = false; last = null }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up)

  function setMode(on, t) {
    drawMode = on; tool = t || 'pen'
    document.body.classList.toggle('rk-draw', on)
    bar.querySelector('#rk-pen').classList.toggle('on', on && tool === 'pen')
    bar.querySelector('#rk-eraser').classList.toggle('on', on && tool === 'eraser')
    if (on) fit()
  }
  bar.querySelector('#rk-pen').onclick = function () { setMode(!(drawMode && tool === 'pen'), 'pen') }
  bar.querySelector('#rk-eraser').onclick = function () { setMode(!(drawMode && tool === 'eraser'), 'eraser') }
  bar.querySelector('#rk-color').oninput = function (e) { color = e.target.value }
  bar.querySelector('#rk-undo').onclick = function () { var d = undo.pop(); if (d && ctx) ctx.putImageData(d, 0, 0) }
  bar.querySelector('#rk-clear').onclick = function () { if (ctx && confirm('Стереть все рукописные пометки?')) ctx.clearRect(0, 0, cv.width, cv.height) }

  // ---- сохранение: состояние в JSON, страница целиком в новый файл
  function hasInk() {
    if (!ctx) return false
    try { var d = ctx.getImageData(0, 0, cv.width, cv.height).data; for (var i = 3; i < d.length; i += 4) if (d[i]) return true } catch (e) {}
    return false
  }
  bar.querySelector('#rk-save').onclick = function () {
    setMode(false)
    S.marks = {}
    keyed.forEach(function (a) {
      var fix = a.nextElementSibling
      var m = { wrong: a.classList.contains('rk-wrong'), fix: (fix && fix.textContent || '').trim() }
      if (m.wrong || m.fix) S.marks[a.getAttribute('data-key')] = m
    })
    S.comment = cm.value.trim()
    S.ink = hasInk() ? cv.toDataURL('image/png') : null
    S.inkW = cv.width || 0; S.inkH = cv.height || 0
    S.checkedAt = new Date().toISOString()
    slot.textContent = JSON.stringify(S).replace(/</g, '\\\\u003c')
    var clone = document.documentElement.cloneNode(true)
    Array.prototype.forEach.call(clone.querySelectorAll('.rk-runtime'), function (n) { n.remove() })
    Array.prototype.forEach.call(clone.querySelectorAll('.rk-wrong, .rk-sel'), function (n) { n.classList.remove('rk-wrong'); n.classList.remove('rk-sel') })
    clone.querySelector('body').classList.remove('rk-draw')
    var html = '<!doctype html>\\n' + clone.outerHTML
    var name = (document.body.getAttribute('data-file') || 'exercise') + '-checked.html'
    function download() {
      var a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
      a.download = name
      a.click()
      setTimeout(function () { URL.revokeObjectURL(a.href) }, 2000)
      status.textContent = 'Сохранено: ' + name + '. Отправьте файл ученику.'
    }
    // Файл открыт с сервера (кабинет преподавателя): проверка уходит на сервер, файл не нужен.
    var reviewUrl = document.body.getAttribute('data-review-url')
    if (reviewUrl && typeof fetch === 'function') {
      status.textContent = 'Отправляю…'
      fetch(reviewUrl, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(S)
      })
        .then(function (r) { return r.json().then(function (b) { if (!r.ok) throw new Error(b && b.error || ('код ' + r.status)); return b }) })
        .then(function () { status.textContent = 'Проверка отправлена ученику ' + new Date(S.checkedAt).toLocaleString('ru-RU') })
        .catch(function (e) { status.textContent = 'Не удалось отправить (' + e.message + '). '; download() })
      return
    }
    download()
  }
})()
`

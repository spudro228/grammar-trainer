// Выгрузка упражнения с ответами ученика для проверки преподавателем.
import type { ExerciseBlock, Part } from './types'
import { draftKey } from './store'
import { REVIEW_KIT_CSS, REVIEW_KIT_JS } from './reviewKit'

/** Убирает HTML-разметку: <br> → перенос строки, теги — удаляются. */
export function stripHtml(html: string): string {
  return html
    .replace(/<p class="muted">[\s\S]*?<\/p>/g, '') // служебные заметки приложения
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

const blank = (v: string) => (v.trim() === '' ? '［＿＿＿］' : `【${v.trim()}】`)

function partToText(block: ExerciseBlock, pi: number, part: Part, drafts: Record<string, string>): string {
  const out: string[] = []
  const head = (part.label ? part.label + ' ' : '') + stripHtml(part.instruction)
  if (part.audio) out.push(`🔊 ${part.audio}. Прослушайте аудио: без него задание не выполнить.`)
  out.push(head)
  if (part.box) out.push('Слова: ' + part.box.join(', '))
  if (part.text) out.push('', stripHtml(part.text))
  if (part.type === 'info') return out.join('\n')
  out.push('')
  if (part.type === 'set') {
    for (const item of part.items) {
      const pre = item.prefilled ?? []
      const n = (item.blanks ?? 0) - pre.length
      const values = Array.from({ length: n }, (_, b) => (drafts[draftKey(block.id, pi, item.n, b)] ?? '').trim()).filter(Boolean)
      out.push(`${item.label}: ${[...pre, ...values].join(', ') || '—'}`)
    }
    return out.join('\n')
  }
  for (const item of part.items) {
    const segs = stripHtml(item.text.replace(' | ', '   ')).split('___')
    let line: string
    if (part.type === 'choice') {
      const chosen = item.example ? (item.answers[0]?.[0] ?? '') : (drafts[draftKey(block.id, pi, item.n, 0)] ?? '')
      const pick = chosen ? `【${chosen}】` : '［не выбрано］'
      // выбранный вариант стоит на месте пропуска, варианты перечислены после
      line = segs.length > 1
        ? (segs[0] ?? '') + pick + segs.slice(1).join('___') + '   (' + (item.options ?? []).join(' / ') + ')'
        : segs.join('') + '   ' + (item.options ?? []).join(' / ') + '  → ' + pick
    } else {
      line = segs
        .map((s, i) => {
          if (i === segs.length - 1) return s
          const v = item.example ? item.answers[i]?.[0] ?? '' : drafts[draftKey(block.id, pi, item.n, i)] ?? ''
          return s + blank(v)
        })
        .join('')
    }
    out.push(`${item.n}. ${line}${item.example ? '   (пример)' : ''}`)
  }
  return out.join('\n')
}

/** Текст упражнения с ответами ученика. Пустые пропуски показаны как [____]. */
export function exerciseToText(block: ExerciseBlock, drafts: Record<string, string>, bookTitle: string): string {
  const lines = [
    `${bookTitle}, стр. ${block.page}`,
    `${block.label ?? `Exercise ${block.number}`}. ${block.title ? block.title + '. ' : ''}(${block.charts})`,
    `Дата: ${new Date().toLocaleDateString('ru-RU')}`,
    '',
    'Прошу проверить. Мои ответы выделены скобками 【 】, пустые пропуски ［＿＿＿］.',
    '',
  ]
  block.parts.forEach((part, pi) => {
    lines.push(partToText(block, pi, part, drafts), '')
  })
  return lines.join('\n').trim() + '\n'
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** HTML контента без служебных заметок приложения. */
const clean = (html: string) => html.replace(/<p class="muted">[\s\S]*?<\/p>/g, '')
const blankHtml = (v: string, key: string) =>
  v.trim() === '' ? `<span class="empty" data-key="${esc(key)}">&nbsp;</span>` : `<mark data-key="${esc(key)}">${esc(v.trim())}</mark>`

function partToHtml(block: ExerciseBlock, pi: number, part: Part, drafts: Record<string, string>): string {
  const out: string[] = []
  if (part.audio) out.push(`<p class="audio-note">🔊 <b>${esc(part.audio)}</b> Прослушайте аудио: без него задание не выполнить.</p>`)
  out.push(`<p class="instruction">${part.label ? `<b>${esc(part.label)}</b> ` : ''}${clean(part.instruction)}</p>`)
  if (part.box) out.push(`<p class="box">${part.box.map(esc).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</p>`)
  if (part.text) out.push(`<div class="text">${clean(part.text)}</div>`)
  if (part.type === 'info') return out.join('\n')
  if (part.type === 'set') {
    out.push('<table class="set">')
    for (const item of part.items) {
      const pre = item.prefilled ?? []
      const n = (item.blanks ?? 0) - pre.length
      const values = Array.from({ length: n }, (_, b) => ({ v: (drafts[draftKey(block.id, pi, item.n, b)] ?? '').trim(), key: draftKey(block.id, pi, item.n, b) })).filter((x) => x.v)
      out.push(`<tr><th>${esc(item.label ?? '')}</th><td>${[...pre.map(esc), ...values.map((x) => `<mark data-key="${esc(x.key)}">${esc(x.v)}</mark>`)].join(', ') || '—'}</td></tr>`)
    }
    out.push('</table>')
    return out.join('\n')
  }
  out.push('<ol>')
  for (const item of part.items) {
    const segs = item.text.replace(' | ', '&emsp;&emsp;').split('___')
    let line: string
    if (part.type === 'choice') {
      const ckey = draftKey(block.id, pi, item.n, 0)
      const chosen = item.example ? (item.answers[0]?.[0] ?? '') : (drafts[ckey] ?? '')
      const slot = chosen ? `<mark data-key="${esc(ckey)}">${esc(chosen)}</mark>` : `<span class="empty" data-key="${esc(ckey)}">&nbsp;</span>`
      const opts = ' <span class="options">' + (item.options ?? []).map(esc).join(' / ') + '</span>'
      line = segs.length > 1 ? (segs[0] ?? '') + slot + segs.slice(1).join('___') + opts : segs.join('') + opts + ' ' + slot
    } else {
      line = segs
        .map((sg, i) => {
          if (i === segs.length - 1) return sg
          const v = item.example ? item.answers[i]?.[0] ?? '' : drafts[draftKey(block.id, pi, item.n, i)] ?? ''
          return sg + (item.example ? `<u>${esc(v)}</u>` : blankHtml(v, draftKey(block.id, pi, item.n, i)))
        })
        .join('')
    }
    out.push(`<li value="${item.n}"${item.example ? ' class="example"' : ''}>${line}${item.example ? ' <small>(пример)</small>' : ''}</li>`)
  }
  out.push('</ol>')
  return out.join('\n')
}

const stampOf = (now: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}`
}

/** Имя файла выгрузки с датой и временем: версии в «Загрузках» не путаются. */
export function exportFileName(block: ExerciseBlock, now = new Date()): string {
  return `exercise-${block.id}_${stampOf(now)}`
}

/** Имя файла с несколькими заданиями: первое и последнее задание и время. */
export function exportBatchFileName(blocks: ExerciseBlock[], now = new Date()): string {
  if (blocks.length === 1 && blocks[0]) return exportFileName(blocks[0], now)
  const first = blocks[0]?.id ?? ''
  const last = blocks[blocks.length - 1]?.id ?? ''
  return `exercises-${first}--${last}_${stampOf(now)}`
}

const blockTitle = (block: ExerciseBlock) => `${block.label ?? `Exercise ${block.number}`}${block.title ? `. ${block.title}` : ''}`
const blockBody = (block: ExerciseBlock, drafts: Record<string, string>) =>
  block.parts.map((part, pi) => `<section>${partToHtml(block, pi, part, drafts)}</section>`).join('\n')

/** Страница для преподавателя: оформление, подсказка и набор для проверки. */
function reviewPage(o: { title: string; meta: string; body: string; file: string; review: Record<string, unknown> }): string {
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<title>${esc(o.title)}</title>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif; font-size: 19px; line-height: 2.2; width: 820px; margin: 0 auto; padding: 24px 20px 40px; color: #111; }
  header { border-bottom: 3px solid #b3171c; margin-bottom: 20px; padding-bottom: 8px; }
  header h1 { font-size: 24px; margin: 0 0 4px; color: #b3171c; }
  header .meta { color: #666; font-size: 14px; line-height: 1.5; }
  .contents { font-size: 15px; line-height: 1.6; color: #444; margin: 0 0 10px; padding-left: 22px; }
  article.exercise { margin-top: 34px; }
  article.exercise h2 { font-size: 21px; color: #b3171c; border-bottom: 1px solid #e3b5b6; margin: 0 0 6px; line-height: 1.5; }
  article.exercise h2 small { color: #888; font-weight: 400; font-size: 14px; }
  .note { background: #fff6d6; border-left: 4px solid #e0b000; padding: 8px 14px; font-size: 15px; line-height: 1.5; margin: 14px 0 22px; }
  .instruction { font-weight: 600; }
  .box { background: #efefef; padding: 6px 14px; display: inline-block; }
  .audio-note { display: inline-block; background: #fff4e0; border: 1px solid #f0c27a; border-radius: 6px; padding: 4px 12px; margin: 4px 0; }
  .text { margin: 6px 0 10px; }
  ol { padding-left: 28px; }
  li { margin: 4px 0; }
  li.example { color: #555; }
  mark { background: #fff0a8; color: #0a2a7a; font-weight: 700; padding: 1px 8px; border-radius: 4px; box-decoration-break: clone; }
  .empty { display: inline-block; min-width: 120px; border-bottom: 2px dotted #c00; vertical-align: baseline; }
  .options { color: #555; }
  ruby rt { font-size: 0.55em; color: #444; }
  table.set { border-collapse: collapse; } table.set th, table.set td { border: 1px solid #333; padding: 4px 12px; text-align: left; }
  u { text-decoration-color: #999; }
  small { color: #888; }
  @media print { body { margin: 0; font-size: 16px; } }
${REVIEW_KIT_CSS}
</style></head>
<body data-file="${o.file}">
<header>
  <h1>${esc(o.title)}</h1>
  <div class="meta">${o.meta}</div>
</header>
<div class="note">Прошу проверить. <mark>Жёлтым</mark> выделены мои ответы, пунктир <span class="empty" style="min-width:60px"></span> — пустой пропуск. Нажмите на ответ, чтобы зачеркнуть и вписать исправление. Кнопка «Ручка» — писать от руки. В конце нажмите «Сохранить проверку» и отправьте файл обратно.</div>
${o.body}
<script id="review" type="application/json">${JSON.stringify(o.review).replace(/</g, '\\u003c')}</script>
<script>${REVIEW_KIT_JS.replace(/<\/script/g, '<\\/script')}</script>
</body></html>
`
}

/** Оформленная страница упражнения с ответами ученика. Ответы выделены жёлтым, пустые пропуски — пунктиром. */
export function exerciseToHtml(block: ExerciseBlock, drafts: Record<string, string>, bookTitle: string): string {
  return reviewPage({
    title: blockTitle(block),
    meta: `${esc(bookTitle)}, стр. ${block.page} · ${esc(block.charts)} · ${new Date().toLocaleDateString('ru-RU')}`,
    body: blockBody(block, drafts),
    file: exportFileName(block),
    review: { exerciseId: block.id, book: bookTitle },
  })
}

/** Несколько заданий на одной странице с общим набором для проверки. Одно задание — как exerciseToHtml. */
export function exercisesToHtml(blocks: ExerciseBlock[], drafts: Record<string, string>, bookTitle: string): string {
  if (blocks.length === 1 && blocks[0]) return exerciseToHtml(blocks[0], drafts, bookTitle)
  const pages = [...new Set(blocks.map((b) => b.page))]
  return reviewPage({
    title: `Задания: ${String(blocks.length)}`,
    meta: `${esc(bookTitle)}, стр. ${pages.join(', ')} · ${new Date().toLocaleDateString('ru-RU')}`,
    body:
      `<ol class="contents">${blocks.map((b) => `<li><a href="#ex-${esc(b.id)}">${esc(blockTitle(b))}</a></li>`).join('')}</ol>\n` +
      blocks
        .map((b) => `<article class="exercise" id="ex-${esc(b.id)}">\n<h2>${esc(blockTitle(b))} <small>стр. ${b.page} · ${esc(b.charts)}</small></h2>\n${blockBody(b, drafts)}\n</article>`)
        .join('\n'),
    file: exportBatchFileName(blocks),
    review: { exerciseId: blocks[0]?.id ?? '', exerciseIds: blocks.map((b) => b.id), book: bookTitle },
  })
}

/** Скачивает один файл со всеми выбранными заданиями, текст всех заданий кладёт в буфер обмена. */
export async function shareExercises(blocks: ExerciseBlock[], drafts: Record<string, string>, bookTitle: string): Promise<boolean> {
  return shareExercise(
    exercisesToHtml(blocks, drafts, bookTitle),
    blocks.map((b) => exerciseToText(b, drafts, bookTitle)).join('\n\n────────\n\n'),
    `${exportBatchFileName(blocks)}.html`,
  )
}

/** Скачивает HTML-файл и копирует текстовую версию в буфер обмена. Возвращает true, если буфер доступен. */
export async function shareExercise(html: string, text: string, filename: string): Promise<boolean> {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

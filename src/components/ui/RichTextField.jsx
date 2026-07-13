import { useEffect, useMemo, useRef } from 'react'
import { Bold, Eraser, Italic, List, Palette } from 'lucide-react'

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'SPAN'])
const COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeColor(value) {
  const normalized = String(value || '').trim()
  return COLOR_PATTERN.test(normalized) ? normalized : ''
}

function sanitizeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent || '')
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const tagName = node.tagName.toUpperCase()
  const children = Array.from(node.childNodes).map(sanitizeNode).join('')

  if (tagName === 'DIV') {
    return children.trim() === '' ? '<p><br></p>' : `<p>${children}</p>`
  }

  if (!ALLOWED_TAGS.has(tagName)) {
    return children
  }

  if (tagName === 'BR') {
    return '<br>'
  }

  if (tagName === 'SPAN') {
    const color = normalizeColor(node.style?.color)
    return color ? `<span style="color:${color}">${children}</span>` : children
  }

  return `<${tagName.toLowerCase()}>${children}</${tagName.toLowerCase()}>`
}

export function sanitizeRichText(value) {
  const source = String(value || '')
  if (source.trim() === '') {
    return ''
  }

  const parser = new DOMParser()
  const documentNode = parser.parseFromString(source, 'text/html')
  const html = Array.from(documentNode.body.childNodes).map(sanitizeNode).join('')
  const plain = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()

  return plain === '' ? '' : html
}

export function stripRichText(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toEditorHtml(value) {
  const source = String(value || '')
  if (source.trim() === '') {
    return ''
  }

  if (/<[a-z][\s\S]*>/i.test(source)) {
    return sanitizeRichText(source)
  }

  return escapeHtml(source).replace(/\n/g, '<br>')
}

export default function RichTextField({
  label,
  value,
  onChange,
  placeholder = 'Write here...',
  dir = 'ltr',
}) {
  const editorRef = useRef(null)
  const colorInputRef = useRef(null)
  const editorValue = useMemo(() => toEditorHtml(value), [value])

  useEffect(() => {
    if (!editorRef.current) {
      return
    }

    if (editorRef.current.innerHTML !== editorValue) {
      editorRef.current.innerHTML = editorValue
    }
  }, [editorValue])

  const syncValue = () => {
    if (!editorRef.current) {
      return
    }

    const sanitized = sanitizeRichText(editorRef.current.innerHTML)
    if (editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized
    }
    onChange(sanitized)
  }

  const applyCommand = (command, commandValue = null) => {
    if (!editorRef.current) {
      return
    }

    editorRef.current.focus()
    document.execCommand(command, false, commandValue)
    syncValue()
  }

  return (
    <div className="space-y-2 text-sm text-zinc-300">
      <span>{label}</span>
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/4">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-3 py-2">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand('bold')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-200 transition hover:bg-white/8"
            aria-label="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand('italic')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-200 transition hover:bg-white/8"
            aria-label="Italic"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand('insertUnorderedList')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-200 transition hover:bg-white/8"
            aria-label="Bullet list"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => colorInputRef.current?.click()}
            className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-zinc-200 transition hover:bg-white/8"
          >
            <Palette size={16} />
            <span className="text-xs">Color</span>
          </button>
          <input
            ref={colorInputRef}
            type="color"
            className="sr-only"
            onChange={(event) => applyCommand('foreColor', event.target.value)}
          />
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand('removeFormat')}
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-xl px-3 text-zinc-400 transition hover:bg-white/8 hover:text-white"
          >
            <Eraser size={16} />
            <span className="text-xs">Clear</span>
          </button>
        </div>

        <div
          ref={editorRef}
          dir={dir}
          contentEditable
          suppressContentEditableWarning
          onInput={syncValue}
          className="min-h-[150px] w-full px-4 py-3 text-white outline-none [&_li]:ml-5 [&_li]:list-disc"
          data-placeholder={placeholder}
          style={{ whiteSpace: 'pre-wrap' }}
        />
      </div>
      <p className="text-xs text-zinc-500">Supports bold, italic, lists, and text color.</p>
    </div>
  )
}

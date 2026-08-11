import { useEffect, useRef } from 'react'

const TOOLS = [
  { cmd: 'bold', label: 'B', className: 'font-bold' },
  { cmd: 'italic', label: 'I', className: 'italic' },
  { cmd: 'underline', label: 'U', className: 'underline' },
  { cmd: 'strikeThrough', label: 'S', className: 'line-through' },
  { cmd: 'insertUnorderedList', label: '•', className: '' },
  { cmd: 'formatBlock:blockquote', label: '❝', className: '' },
]

// Lightweight rich-text description input (US-12): bold, italic, underline,
// strikethrough, list, and quote block, backed by contentEditable + execCommand.
export default function RichTextEditor({ value, onChange, onBlur, placeholder }) {
  const ref = useRef(null)

  // Uncontrolled contentEditable: set the initial HTML once so React never
  // overwrites the DOM (and resets the caret) while the user is typing.
  useEffect(() => {
    if (ref.current && !ref.current.innerHTML) {
      ref.current.innerHTML = value ?? ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function runCommand(cmd) {
    ref.current?.focus()
    if (cmd.startsWith('formatBlock:')) {
      document.execCommand('formatBlock', false, cmd.split(':')[1])
    } else {
      document.execCommand(cmd, false, null)
    }
    onChange(ref.current?.innerHTML ?? '')
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {TOOLS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand(t.cmd)}
            className={`w-7 h-7 flex items-center justify-center text-xs rounded-lg text-gray-600 hover:bg-gray-200 ${t.className}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onBlur={(e) => onBlur?.(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
        className="prose-sm min-h-[100px] px-4 py-2.5 text-sm text-gray-800 focus:outline-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400 [&_ul]:list-disc [&_ul]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500 [&_blockquote]:italic"
      />
    </div>
  )
}

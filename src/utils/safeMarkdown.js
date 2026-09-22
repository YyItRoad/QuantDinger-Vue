function escapeHtml (value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInline (value) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
}

function renderTable (rows) {
  const cells = rows
    .map(row => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim()))
    .filter(row => row.length > 1)
  if (cells.length < 2) return ''
  const header = cells[0]
  const body = cells.slice(2)
  return [
    '<div class="qd-markdown-table-wrap"><table class="qd-markdown-table">',
    `<thead><tr>${header.map(cell => `<th>${renderInline(cell)}</th>`).join('')}</tr></thead>`,
    `<tbody>${body.map(row => `<tr>${row.map(cell => `<td>${renderInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`,
    '</table></div>'
  ].join('')
}

export function renderSafeMarkdown (text) {
  const codeBlocks = []
  const source = String(text || '').replace(/\r\n/g, '\n')
  const withTokens = source.replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const index = codeBlocks.length
    const language = escapeHtml(lang || 'text')
    codeBlocks.push(`<pre class="qd-markdown-code"><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>`)
    return `\n@@QD_CODE_${index}@@\n`
  })
  const lines = withTokens.split('\n')
  const output = []
  let listType = ''
  let paragraph = []

  const closeList = () => {
    if (!listType) return
    output.push(`</${listType}>`)
    listType = ''
  }
  const closeParagraph = () => {
    if (!paragraph.length) return
    output.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`)
    paragraph = []
  }
  const closeBlocks = () => {
    closeParagraph()
    closeList()
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const trimmed = line.trim()
    const codeToken = trimmed.match(/^@@QD_CODE_(\d+)@@$/)
    if (codeToken) {
      closeBlocks()
      output.push(codeBlocks[Number(codeToken[1])] || '')
      continue
    }
    if (!trimmed) {
      closeBlocks()
      continue
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeBlocks()
      output.push('<hr>')
      continue
    }
    const nextLine = lines[index + 1] || ''
    if (trimmed.includes('|') && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(nextLine)) {
      closeBlocks()
      const tableRows = [line, nextLine]
      index += 2
      while (index < lines.length && lines[index].trim().includes('|')) {
        tableRows.push(lines[index])
        index++
      }
      index--
      output.push(renderTable(tableRows))
      continue
    }
    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      closeBlocks()
      const level = Math.min(heading[1].length + 2, 5)
      output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`)
      continue
    }
    const quote = trimmed.match(/^>\s*(.+)$/)
    if (quote) {
      closeBlocks()
      output.push(`<blockquote>${renderInline(quote[1])}</blockquote>`)
      continue
    }
    const ordered = trimmed.match(/^\d+[.)、）]\s+(.+)$/)
    const unordered = trimmed.match(/^[-*+]\s+(.+)$/)
    if (ordered || unordered) {
      closeParagraph()
      const target = ordered ? 'ol' : 'ul'
      if (listType !== target) {
        closeList()
        output.push(`<${target}>`)
        listType = target
      }
      output.push(`<li>${renderInline((ordered || unordered)[1])}</li>`)
      continue
    }
    closeList()
    paragraph.push(line)
  }
  closeBlocks()
  return output.join('')
}

export { escapeHtml as escapeMarkdownHtml }

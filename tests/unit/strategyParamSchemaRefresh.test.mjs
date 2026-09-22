import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const editorPath = fileURLToPath(
  new URL('../../src/views/strategy-ide/components/StrategyEditor.vue', import.meta.url)
)
const source = fs.readFileSync(editorPath, 'utf8')

test('editing code publishes the current inferred parameter schema to the source form', () => {
  assert.match(source, /refreshInferredParamsFromCode \(code/)
  assert.match(source, /param_schema: \{ params: inferred\.params\.map\(item => \(\{ \.\.\.item \}\)\) \}/)
  assert.match(source, /param_schema: \{ params: \[\] \}/)
})

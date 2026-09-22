import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('new strategy drafts start with a genuinely empty editor', () => {
  const workspace = read('src/views/strategy-ide/index.vue')
  const editor = read('src/views/strategy-ide/components/StrategyEditor.vue')

  assert.match(workspace, /const EMPTY_DRAFT_CODE = ''/)
  assert.match(workspace, /scriptCode: EMPTY_DRAFT_CODE/)
  assert.match(workspace, /createNewDraft[\s\S]*this\.scriptCode = EMPTY_DRAFT_CODE/)
  assert.match(workspace, /String\(source\.code \|\| ''\)/)

  assert.match(editor, /value: String\(this\.value \|\| ''\)/)
  assert.match(editor, /loadBlankTemplate[\s\S]*this\.setCode\(''\)/)
  assert.doesNotMatch(editor, /_getDefaultCode/)
  assert.doesNotMatch(editor, /My Custom Strategy/)
  assert.doesNotMatch(editor, /single_ma_regime/)
})

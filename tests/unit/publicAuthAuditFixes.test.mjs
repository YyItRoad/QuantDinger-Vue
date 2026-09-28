import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read (relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

test('Turnstile initialization is shared and an explicit challenge resolves the caller', async () => {
  const source = read('src/components/Turnstile/index.vue')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  assert.ok(script)

  let widgetConfig
  let renderCount = 0
  let executeCount = 0
  const scriptElement = {
    dataset: {},
    listeners: {},
    addEventListener (name, handler) {
      this.listeners[name] = handler
    }
  }

  globalThis.window = {}
  globalThis.document = {
    querySelector: () => null,
    createElement: () => scriptElement,
    head: {
      appendChild () {
        window.turnstile = {
          render (container, config) {
            renderCount += 1
            widgetConfig = config
            return 'widget-1'
          },
          execute () {
            executeCount += 1
            queueMicrotask(() => widgetConfig.callback('verified-token'))
          },
          remove () {},
          reset () {}
        }
        queueMicrotask(() => scriptElement.listeners.load())
      }
    }
  }

  const moduleSource = `${script.replace(/export default\s*/, 'const component = ')}\nexport { component }`
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
  const { component } = await import(moduleUrl)
  const instance = {
    ...component.data(),
    ...component.methods,
    enabled: true,
    siteKey: 'test-site-key',
    theme: 'auto',
    size: 'normal',
    appearance: 'always',
    execution: 'execute',
    executeTimeoutMs: 1000,
    $refs: { turnstileRef: {} },
    $nextTick: () => Promise.resolve(),
    $t: key => key,
    $emit: () => {}
  }
  for (const methodName of Object.keys(component.methods)) {
    instance[methodName] = component.methods[methodName].bind(instance)
  }

  await Promise.all([instance.initTurnstile(), instance.initTurnstile()])
  assert.equal(renderCount, 1)
  assert.equal(await instance.execute(), 'verified-token')
  assert.equal(executeCount, 1)

  delete globalThis.window
  delete globalThis.document
})

test('public authentication fixes cover consent, Arabic copy, and route titles', () => {
  const login = read('src/views/user/Login.vue')
  const arabic = read('src/locales/lang/ar-SA.js')
  const router = read('src/config/router.config.js')
  const permission = read('src/permission.js')

  assert.match(login, /legalAgreed:\s*false/)
  assert.match(login, /class="legal-error" role="alert" aria-live="assertive"/)
  assert.match(login, /execution="execute"/)
  assert.match(arabic, /"user\.login\.hero\.title":\s*"(?!Turn uncertain)/)
  assert.match(router, /name:\s*'login',[\s\S]*?meta:\s*\{\s*title:\s*'user\.login\.tab'\s*\}/)
  assert.match(permission, /setDocumentTitle\(routeTitle \?[^:]+:\s*domTitle\)/)
})

test('public crawler files exist and unknown HTTP paths do not fall back to the app shell', () => {
  assert.match(read('public/robots.txt'), /Sitemap:\s*https:\/\/ai\.quantdinger\.com\/sitemap\.xml/)
  assert.match(read('public/sitemap.xml'), /<loc>https:\/\/ai\.quantdinger\.com\/<\/loc>/)

  for (const configPath of [
    'deploy/nginx-docker.conf',
    'deploy/nginx-docker.conf.template',
    'deploy/nginx.conf'
  ]) {
    const config = read(configPath)
    assert.match(config, /location = \/\s*\{[\s\S]*?try_files \/index\.html =404;/)
    assert.doesNotMatch(config, /try_files \$uri \$uri\/ \/index\.html;/)
  }
})

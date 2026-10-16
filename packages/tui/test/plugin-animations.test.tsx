/** @jsxImportSource @opentui/solid */
import { testRender } from "@opentui/solid"
import { expect, test } from "bun:test"
import { ConfigProvider, useConfig, type Info, type Interface } from "../src/config"
import { createPluginContext, type Registry, type usePluginHost } from "../src/plugin/api"
import { createTuiResolvedConfig } from "./fixture/tui-runtime"

async function renderAnimations(info: Info) {
  let current = info
  const service: Interface = {
    get: async () => current,
    update: async (update) => {
      const draft: Record<string, any> = { ...current }
      update(draft)
      current = draft
      return draft
    },
  }
  let config: ReturnType<typeof useConfig> | undefined

  function Consumer() {
    config = useConfig()
    // Eagerly read host services need a shape; animations go through the real ConfigProvider.
    const host = {
      app: {},
      client: {},
      keymap: {},
      shortcuts: {},
      keymapState: {},
      sessionTabs: {},
      config,
    } as unknown as ReturnType<typeof usePluginHost>
    const registry: Registry = { has: () => false, set() {}, remove() {}, active: () => true }
    const context = createPluginContext({ host, id: "test", options: undefined, owned: [], registry })
    return <text>{context.animations ? "animated" : "still"}</text>
  }

  const app = await testRender(() => (
    <ConfigProvider config={createTuiResolvedConfig(info)} service={service}>
      <Consumer />
    </ConfigProvider>
  ))
  await app.renderOnce()
  if (!config) throw new Error("Config context was not provided")
  return { app, config, [Symbol.dispose]: () => app.renderer.destroy() }
}

test("plugins see animations enabled when the setting is unset", async () => {
  using setup = await renderAnimations({})
  expect(setup.app.captureCharFrame()).toContain("animated")
})

test("plugins follow the animations setting as it toggles", async () => {
  using setup = await renderAnimations({ animations: false })
  expect(setup.app.captureCharFrame()).toContain("still")

  await setup.config.update((draft) => {
    draft.animations = true
  })
  await setup.app.renderOnce()
  expect(setup.app.captureCharFrame()).toContain("animated")

  await setup.config.update((draft) => {
    draft.animations = false
  })
  await setup.app.renderOnce()
  expect(setup.app.captureCharFrame()).toContain("still")
})

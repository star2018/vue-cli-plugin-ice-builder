import { toObject } from './utils'
import createStore from './store'
import createApp from './launcher'

export default function createAppWithStore(base, global, plugins) {
  const { store: baseStore, ...baseApp } = toObject(base)
  const { store: globalStore, ...globalApp } = toObject(global)

  const store = createStore(baseStore, globalStore, plugins)

  return createApp({ ...baseApp, store }, globalApp, plugins)
}

// Node 22+ объявляет пустой глобальный localStorage, а jsdom без него. Ставим in-memory реализацию.
class MemoryStorage implements Storage {
  private m = new Map<string, string>()
  get length() { return this.m.size }
  clear() { this.m.clear() }
  getItem(k: string) { return this.m.get(k) ?? null }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  removeItem(k: string) { this.m.delete(k) }
  setItem(k: string, v: string) { this.m.set(k, v) }
}
const ls = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true, writable: true })
if (typeof window !== 'undefined') Object.defineProperty(window, 'localStorage', { value: ls, configurable: true, writable: true })

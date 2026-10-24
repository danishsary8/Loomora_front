import en from './en.json'
import i18n from './index'

function leafKeys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? leafKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

describe('i18n', () => {
  it('uses English and sets <html lang>', () => {
    expect(i18n.language).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('has no empty strings in en.json', () => {
    const keys = leafKeys(en)
    expect(keys.length).toBeGreaterThan(50)
    for (const key of keys) expect(i18n.t(key as never), key).not.toBe('')
  })
})

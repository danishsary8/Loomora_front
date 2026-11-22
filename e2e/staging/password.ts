import { expect, type Locator } from '@playwright/test'

export async function enterPassword(field: Locator, password: string) {
  try {
    await expect(field).toBeEditable()
    // Locator.fill includes the entered value in its diagnostic call log.
    await field.evaluate((input, value) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      if (!(input instanceof HTMLInputElement) || input.type !== 'password' || !setter) {
        throw new Error('Expected a password input')
      }
      setter.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }, password)
  } catch {
    throw new Error('QA-022 could not enter a synthetic password')
  }
}

import { ApiError } from './errors'
import { errorMessageKey } from './errorMessages'

describe('errorMessageKey', () => {
  it.each([
    ['no connection', new ApiError(0, { message: 'Network error' }), 'errors.network'],
    ['401', new ApiError(401, { message: 'Unauthenticated.' }), 'errors.unauthorized'],
    ['422', new ApiError(422, { message: 'Invalid', errors: { a: ['x'] } }), 'errors.validation'],
    ['429', new ApiError(429, {}, 30), 'errors.rateLimited'],
    ['500', new ApiError(500, { message: 'Server Error' }), 'errors.server'],
    ['503', new ApiError(503), 'errors.server'],
    ['404', new ApiError(404, { message: 'Not found' }), 'errors.unexpected'],
    ['a plain Error', new Error('boom'), 'errors.unexpected'],
    ['a thrown string', 'boom', 'errors.unexpected'],
  ])('maps %s to %s', (_name, error, key) => {
    expect(errorMessageKey(error)).toBe(key)
  })
})

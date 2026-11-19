import { makeTokenResponse } from '@/test/apiMocks'
import { ApiError } from './errors'
import { mapApiError } from './errorMapping'
import { useSession } from './session'

describe('errorMapping', () => {
  beforeEach(() => {
    useSession.getState().signOut()
  })

  it('maps network errors (status 0) to user text without raw message', () => {
    const error = new ApiError(0, { message: 'Failed to fetch tcp ECONNREFUSED 127.0.0.1:8000' })
    const mapped = mapApiError(error)

    expect(mapped.status).toBe(0)
    expect(mapped.title).toBe('Connection problem')
    expect(mapped.message).toBe(
      'Cannot connect to the server. Please check your internet connection.',
    )
    expect(mapped.message).not.toContain('ECONNREFUSED')
  })

  it('maps 401 unauthorized to user text and triggers sign out', () => {
    useSession.getState().signIn(makeTokenResponse())
    expect(useSession.getState().token).toBe('1|test-token')

    const error = new ApiError(401, { message: 'Unauthenticated.' })
    const mapped = mapApiError(error)

    expect(mapped.status).toBe(401)
    expect(mapped.title).toBe('Session expired')
    expect(mapped.message).toBe('Your session has expired. Please sign in again.')
    expect(useSession.getState().token).toBeNull()
  })

  it('maps 422 validation errors to user text and extracts fieldErrors', () => {
    const error = new ApiError(422, {
      message: 'The given data was invalid.',
      errors: {
        email: ['The email has already been taken.'],
        password: ['The password must be at least 8 characters.'],
      },
    })
    const mapped = mapApiError(error)

    expect(mapped.status).toBe(422)
    expect(mapped.title).toBe('Check your input')
    expect(mapped.message).toBe('Some details were invalid. Please check the fields and try again.')
    expect(mapped.fieldErrors).toEqual({
      email: 'The email has already been taken.',
      password: 'The password must be at least 8 characters.',
    })
  })

  it('maps 429 rate limit errors to user text without retry-after', () => {
    const error = new ApiError(429, { message: 'Too Many Requests' })
    const mapped = mapApiError(error)

    expect(mapped.status).toBe(429)
    expect(mapped.title).toBe('Too many requests')
    expect(mapped.message).toBe('Too many requests. Please wait a moment and try again.')
  })

  it('maps 429 rate limit errors with retry-after seconds', () => {
    const error = new ApiError(429, { message: 'Too Many Requests' }, 60)
    const mapped = mapApiError(error)

    expect(mapped.status).toBe(429)
    expect(mapped.title).toBe('Too many requests')
    expect(mapped.message).toBe('Too many requests. Please wait 60 seconds and try again.')
  })

  it('maps 5xx server errors to user text without leaking internal details', () => {
    const error = new ApiError(500, {
      message: 'SQLSTATE[HY000]: General error: database disk image is malformed',
    })
    const mapped = mapApiError(error)

    expect(mapped.status).toBe(500)
    expect(mapped.title).toBe('Server problem')
    expect(mapped.message).toBe('The server ran into a problem. Please try again later.')
    expect(mapped.message).not.toContain('SQLSTATE')
  })

  it('maps 503 service unavailable to user text', () => {
    const error = new ApiError(503, { message: 'Service Unavailable' })
    const mapped = mapApiError(error)

    expect(mapped.status).toBe(503)
    expect(mapped.title).toBe('Server problem')
    expect(mapped.message).toBe('The server ran into a problem. Please try again later.')
  })

  it('maps router error response 404 to not found page text', () => {
    const error = { status: 404, statusText: 'Not Found' }
    const mapped = mapApiError(error)

    expect(mapped.status).toBe(404)
    expect(mapped.title).toBe('Page not found')
    expect(mapped.message).toBe('This page does not exist.')
  })

  it('maps router error response 500 to server error text', () => {
    const error = { status: 500, statusText: 'Internal Error' }
    const mapped = mapApiError(error)

    expect(mapped.status).toBe(500)
    expect(mapped.title).toBe('Server problem')
    expect(mapped.message).toBe('The server ran into a problem. Please try again later.')
  })

  it('never shows raw error.message for generic unexpected Error', () => {
    const error = new Error('Secret token leaked in stack trace: xyz-123')
    const mapped = mapApiError(error)

    expect(mapped.status).toBeNull()
    expect(mapped.title).toBe('Something went wrong')
    expect(mapped.message).toBe('Something went wrong. Please try again.')
    expect(mapped.message).not.toContain('xyz-123')
    expect(mapped.message).not.toContain('Secret token')
  })

  it('handles unknown non-error objects safely', () => {
    expect(mapApiError('unexpected string error')).toEqual({
      status: null,
      title: 'Something went wrong',
      message: 'Something went wrong. Please try again.',
    })
    expect(mapApiError(null)).toEqual({
      status: null,
      title: 'Something went wrong',
      message: 'Something went wrong. Please try again.',
    })
    expect(mapApiError(undefined)).toEqual({
      status: null,
      title: 'Something went wrong',
      message: 'Something went wrong. Please try again.',
    })
  })
})

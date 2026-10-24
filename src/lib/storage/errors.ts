/** A write was rejected by the docs/08 rule 11 limits. `field` matches the API error shape. */
export class ValidationError extends Error {
  readonly field: string

  constructor(field: string, message: string) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

export class NotFoundError extends Error {
  constructor(what: string, id: string) {
    super(`${what} ${id} not found`)
    this.name = 'NotFoundError'
  }
}

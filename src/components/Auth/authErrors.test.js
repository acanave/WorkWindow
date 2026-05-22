import { describe, expect, it } from 'vitest'
import { formatMagicLinkError } from './authErrors'

describe('formatMagicLinkError', () => {
  it('explains default SMTP authorization failures', () => {
    expect(formatMagicLinkError({ code: 'email_address_not_authorized' })).toMatch(/built-in Supabase SMTP/i)
  })

  it('explains email send rate limits', () => {
    expect(formatMagicLinkError({ code: 'over_email_send_rate_limit' })).toMatch(/wait a while/i)
  })

  it('explains generic rate exceeded errors', () => {
    expect(formatMagicLinkError({ code: 'rate_limit_exceeded', message: 'Rate exceeded' })).toMatch(/wait a while/i)
  })

  it('explains auth hook table permission failures', () => {
    expect(
      formatMagicLinkError({
        code: 'unexpected_failure',
        message: 'ERROR: permission denied for table allowed_auth_emails (SQLSTATE 42501)',
      }),
    ).toMatch(/SECURITY DEFINER/i)
  })

  it('explains auth hook failures', () => {
    expect(
      formatMagicLinkError({
        code: 'unexpected_failure',
        message: 'Error running hook URI: pg-functions://postgres/public/hook_restrict_signup_to_allowed_emails',
      }),
    ).toMatch(/Auth Hook/i)
  })

  it('falls back to the provided message', () => {
    expect(formatMagicLinkError({ message: 'Something went wrong' })).toBe('Something went wrong')
  })
})

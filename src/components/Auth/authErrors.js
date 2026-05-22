export function formatMagicLinkError(error) {
  const code = String(error?.code || '').toLowerCase()
  const message = String(error?.message || '').trim()
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('permission denied for table allowed_auth_emails')) {
    return 'The Supabase auth hook cannot read allowed_auth_emails. Make the hook SECURITY DEFINER or grant it SELECT access to that table.'
  }

  if (lowerMessage.includes('hook uri')) {
    return 'Supabase rejected this sign-in in an Auth Hook before the magic-link email was sent. Check the Before User Created hook or the allowlist in your Supabase dashboard.'
  }

  if (code === 'email_address_not_authorized') {
    return 'This email is not allowed to receive mail from the built-in Supabase SMTP. Add it to the project team or configure custom SMTP.'
  }

  if (
    code === 'over_email_send_rate_limit' ||
    code === 'rate_limit_exceeded' ||
    lowerMessage.includes('rate exceeded')
  ) {
    return 'Too many sign-in emails were requested. Wait a while and try again.'
  }

  if (code === 'over_request_rate_limit') {
    return 'Too many sign-in requests were sent from this browser or IP. Wait a few minutes and try again.'
  }

  if (code === 'otp_disabled') {
    return 'Passwordless email sign-ins are disabled in this Supabase project.'
  }

  return message || 'Unable to send sign-in email. Check Supabase Auth logs for hook, SMTP, or redirect URL errors.'
}

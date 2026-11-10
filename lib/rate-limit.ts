// In-memory rate limiter (resets on server restart)

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const store = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return { allowed: false, retryAfterMs: entry.blockedUntil - now };
  }

  if (!entry || now - entry.firstAttempt > opts.windowMs) {
    store.set(key, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  entry.count++;
  if (entry.count > opts.maxAttempts) {
    entry.blockedUntil = now + opts.blockDurationMs;
    return { allowed: false, retryAfterMs: opts.blockDurationMs };
  }

  return { allowed: true };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}

// OTP attempt tracking

interface OtpEntry {
  failures: number;
  lockedUntil?: number;
}

interface OtpOptions {
  maxAttempts: number;
  lockoutDurationMs: number;
}

interface OtpResult {
  allowed: boolean;
  lockedUntilMs?: number;
  attemptsRemaining?: number;
}

const otpStore = new Map<string, OtpEntry>();

export function checkOtpAttempt(email: string, opts: OtpOptions): OtpResult {
  const now = Date.now();
  const entry = otpStore.get(email);

  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, lockedUntilMs: entry.lockedUntil - now };
  }

  return { allowed: true, attemptsRemaining: opts.maxAttempts - (entry?.failures ?? 0) };
}

export function recordOtpFailure(email: string, opts: OtpOptions): OtpResult {
  const now = Date.now();
  const entry = otpStore.get(email) ?? { failures: 0 };
  entry.failures++;

  if (entry.failures >= opts.maxAttempts) {
    entry.lockedUntil = now + opts.lockoutDurationMs;
    otpStore.set(email, entry);
    return { allowed: false, lockedUntilMs: opts.lockoutDurationMs };
  }

  otpStore.set(email, entry);
  return { allowed: true, attemptsRemaining: opts.maxAttempts - entry.failures };
}

export function resetOtpAttempts(email: string) {
  otpStore.delete(email);
}

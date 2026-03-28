/**
 * Password validation utilities
 * Rules per D-04: minimum 8 chars, must contain at least one letter and one number
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return {
      valid: false,
      message: "비밀번호는 최소 8자, 영문과 숫자를 포함해야 합니다",
    }
  }

  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  if (!hasLetter || !hasNumber) {
    return {
      valid: false,
      message: "비밀번호는 최소 8자, 영문과 숫자를 포함해야 합니다",
    }
  }

  return { valid: true }
}

/**
 * Check if an account is currently locked
 */
export function isAccountLocked(user: { lockedUntil: Date | null }): boolean {
  if (!user.lockedUntil) return false
  return user.lockedUntil > new Date()
}

/**
 * Get remaining lock time in seconds
 */
export function getRemainingLockTime(user: { lockedUntil: Date | null }): number {
  if (!user.lockedUntil) return 0
  const remaining = user.lockedUntil.getTime() - Date.now()
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0
}

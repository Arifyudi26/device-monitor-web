import { NextApiRequest } from "next";

const messages: Record<string, Record<string, string>> = {
  id: {
    emailPasswordRequired: "Email dan password wajib diisi.",
    nameEmailPasswordRequired: "Nama, email, dan password wajib diisi.",
    namedanPasswordRequired: "Nama dan password wajib diisi.",
    emailPurposeRequired: "Email dan purpose wajib diisi.",
    emailCodePurposeRequired: "Email, kode, dan purpose wajib diisi.",
    newPasswordRequired: "Password baru wajib diisi.",
    emailRegistered: "Email sudah terdaftar.",
    emailNotFound: "Email tidak ditemukan.",
    userNotFound: "Pengguna tidak ditemukan.",
    invalidCredentials: "Email atau password salah.",
    credentialsValid: "Kredensial valid.",
    tooManyLogin: "Terlalu banyak percobaan login. Coba lagi nanti.",
    tooManyOtp: "Terlalu banyak percobaan OTP. Coba lagi nanti.",
    tooManyOtpWrong: "Terlalu banyak kode OTP salah. Akun terkunci sementara.",
    otpSent: "Kode OTP berhasil dikirim.",
    otpInvalid: "Kode OTP tidak valid atau sudah kadaluarsa.",
    otpWrong: "Kode OTP salah.",
    otpExpired: "Kode OTP sudah kadaluarsa.",
    otpFailedSend: "Gagal mengirim OTP. Coba lagi.",
    passwordChanged: "Password berhasil diubah.",
    invalidPurpose: "Purpose tidak valid.",
    methodNotAllowed: "Method tidak diizinkan.",
    serverError: "Terjadi kesalahan server.",
  },
  en: {
    emailPasswordRequired: "Email and password are required.",
    nameEmailPasswordRequired: "Name, email, and password are required.",
    namedanPasswordRequired: "Name and password are required.",
    emailPurposeRequired: "Email and purpose are required.",
    emailCodePurposeRequired: "Email, code, and purpose are required.",
    newPasswordRequired: "New password is required.",
    emailRegistered: "Email is already registered.",
    emailNotFound: "Email not found.",
    userNotFound: "User not found.",
    invalidCredentials: "Invalid email or password.",
    credentialsValid: "Credentials valid.",
    tooManyLogin: "Too many login attempts. Please try again later.",
    tooManyOtp: "Too many OTP attempts. Please try again later.",
    tooManyOtpWrong: "Too many wrong OTP codes. Account temporarily locked.",
    otpSent: "OTP code sent successfully.",
    otpInvalid: "OTP code is invalid or expired.",
    otpWrong: "Wrong OTP code.",
    otpExpired: "OTP code has expired.",
    otpFailedSend: "Failed to send OTP. Try again.",
    passwordChanged: "Password changed successfully.",
    invalidPurpose: "Invalid purpose.",
    methodNotAllowed: "Method not allowed.",
    serverError: "Internal server error.",
  },
};

export function st(req: NextApiRequest, key: string): string {
  const acceptLang = (req.headers["accept-language"] ?? "").toLowerCase();
  const lang = acceptLang.startsWith("en") ? "en" : "id";
  return messages[lang]?.[key] ?? messages["id"]?.[key] ?? key;
}

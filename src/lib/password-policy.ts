export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateStrongPassword(
  password: string,
  email?: string
): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push("A senha deve ter no minimo 12 caracteres.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Inclua pelo menos 1 letra minuscula.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Inclua pelo menos 1 letra maiuscula.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Inclua pelo menos 1 numero.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Inclua pelo menos 1 caractere especial.");
  }
  if (/\s/.test(password)) {
    errors.push("Nao use espacos em branco na senha.");
  }

  const emailPrefix = email?.split("@")[0]?.trim().toLowerCase();
  if (emailPrefix && emailPrefix.length >= 3 && password.toLowerCase().includes(emailPrefix)) {
    errors.push("A senha nao pode conter parte do e-mail.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

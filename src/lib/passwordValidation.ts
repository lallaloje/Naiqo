export interface PasswordStrength {
  score: number; // 0-4 (0: very weak, 4: very strong)
  feedback: string[];
  isValid: boolean;
}

export const validatePassword = (password: string): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  // Minimum length check
  if (password.length < 8) {
    feedback.push("La contraseña debe tener al menos 8 caracteres");
  } else {
    score += 1;
  }

  // Lowercase letters
  if (!/[a-z]/.test(password)) {
    feedback.push("Incluye al menos una letra minúscula");
  } else {
    score += 1;
  }

  // Uppercase letters
  if (!/[A-Z]/.test(password)) {
    feedback.push("Incluye al menos una letra mayúscula");
  } else {
    score += 1;
  }

  // Numbers
  if (!/\d/.test(password)) {
    feedback.push("Incluye al menos un número");
  } else {
    score += 1;
  }

  // Special characters
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push("Incluye al menos un carácter especial (!@#$%^&*...)");
  } else {
    score += 1;
  }

  const isValid = password.length >= 8 && score >= 3;

  return {
    score: Math.min(score, 4),
    feedback,
    isValid
  };
};

export const getPasswordStrengthLabel = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return "Muy débil";
    case 2:
      return "Débil";
    case 3:
      return "Buena";
    case 4:
      return "Muy fuerte";
    default:
      return "Muy débil";
  }
};

export const getPasswordStrengthColor = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return "text-destructive";
    case 2:
      return "text-orange-500";
    case 3:
      return "text-yellow-500";
    case 4:
      return "text-green-500";
    default:
      return "text-destructive";
  }
};
import { cn } from "@/lib/utils";
import { PasswordStrength, getPasswordStrengthLabel, getPasswordStrengthColor } from "@/lib/passwordValidation";

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
  className?: string;
}

export const PasswordStrengthIndicator = ({ strength, className }: PasswordStrengthIndicatorProps) => {
  if (!strength) return null;

  const { score, feedback } = strength;
  const strengthLabel = getPasswordStrengthLabel(score);
  const strengthColor = getPasswordStrengthColor(score);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Strength bars */}
      <div className="flex space-x-1">
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              "h-2 flex-1 rounded-full",
              level < score
                ? score <= 1
                  ? "bg-destructive"
                  : score === 2
                  ? "bg-orange-500"
                  : score === 3
                  ? "bg-yellow-500"
                  : "bg-green-500"
                : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Strength label */}
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-medium", strengthColor)}>
          Seguridad: {strengthLabel}
        </span>
      </div>

      {/* Feedback */}
      {feedback.length > 0 && (
        <ul className="space-y-1">
          {feedback.map((item, index) => (
            <li key={index} className="text-xs text-muted-foreground flex items-center">
              <span className="w-1 h-1 bg-muted-foreground rounded-full mr-2" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
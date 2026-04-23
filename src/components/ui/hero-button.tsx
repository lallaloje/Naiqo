import { forwardRef } from "react";
import { Button, ButtonProps } from "./button";
import { cn } from "@/lib/utils";

export interface HeroButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: "primary" | "secondary" | "outline";
}

const HeroButton = forwardRef<HTMLButtonElement, HeroButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    const variants = {
      primary: "bg-gradient-primary hover:shadow-brand text-white border-0 hover:scale-105 transition-all",
      secondary: "bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 hover:scale-105 transition-all",
      outline: "bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-white hover:scale-105 transition-all"
    };

    return (
      <Button
        className={cn(
          "px-8 py-6 text-lg font-semibold rounded-xl shadow-brand",
          variants[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
HeroButton.displayName = "HeroButton";

export { HeroButton };
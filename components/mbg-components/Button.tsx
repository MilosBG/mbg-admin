import { cn } from "@/lib/utils";
import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  mbg?: "prime" | "primefull" | "second" | "secondfull" | "trey" | "treyfull";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, mbg = "prime", ...props }, ref) => {
    const mbgStyles = {
      prime: "mbg-prime",
      primefull: "mbg-prime-full",
      second: "mbg-second",
      secondfull: "mbg-second-full",
      trey: "mbg-trey",
      treyfull: "mbg-trey-full",
    };

    return (
      <button
        ref={ref}
        className={cn("mbg-prime", mbgStyles[mbg], className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
export default Button;

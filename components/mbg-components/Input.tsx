/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, value, ...props }, ref) => {
    const normalizedValue =
      value === undefined || value === null ? "" : (value as any);
    return (
      <div className="flex flex-col space-y-1">
        <input
          ref={ref}
          className={cn(
            "text-mbg-green bg-mbg-rgbablank focus:ring-mbg-green focus:border-mbg-green rounded-xs border px-3 py-1 text-xs transition duration-200 focus:ring-2 focus:outline-none",
            error ? "border-mbg-red" : "border-mbg-rgbalight",
            className,
          )}
          value={normalizedValue}
          {...props}
        />
        {error && <span className="text-mbg-red text-sm">{error}</span>}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;

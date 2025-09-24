import React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
}
const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-mbg-darkgrey mbg-text-up font-medium uppercase",
          className,
        )}
        {...props}
      />
    );
  },
);

Label.displayName = "Label";
export default Label;

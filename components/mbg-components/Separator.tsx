import React from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  className?: string;
}
const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <hr
        ref={ref}
        className={cn("border-t border-mbg-lightgrey my-4", className)}
        {...props}
      />
    );
  }
);

Separator.displayName = "Separator";
export default Separator;

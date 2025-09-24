import { cn } from "@/lib/utils";
import React from "react";

const Container = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "text-mbg-darkgrey mx-auto mt-7 max-w-screen-xl px-4 text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
};

export default Container;

import { cn } from "@/lib/utils";

const H3 = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h3
      className={cn("uppercase font-bold text-xs text-mbg-black/20", className)}
    >
      {children}
    </h3>
  );
};

export { H3 };

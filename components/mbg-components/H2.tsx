import { cn } from "@/lib/utils";

const H2 = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h2
      className={cn(
        "text-mbg-black/64 text-lg font-extrabold uppercase",
        className,
      )}
    >
      {children}
    </h2>
  );
};

export { H2 };

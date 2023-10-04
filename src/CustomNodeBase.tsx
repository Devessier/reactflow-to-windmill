import { clsx } from "clsx";

export function CustomNodeBase({
  isFocused,
  children,
}: {
  isFocused: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx([
        "border-2 rounded-sm relative bg-white",
        { "shadow-2xl": isFocused },
      ])}
    >
      {children}
    </div>
  );
}

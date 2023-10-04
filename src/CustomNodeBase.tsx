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
        "text-slate-800 rounded-md relative bg-slate-200 font-mono",
        { "ring-2 ring-offset-1 ring-slate-600": isFocused },
      ])}
    >
      {children}
    </div>
  );
}

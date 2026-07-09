import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card variant="subtle" className={clsx("text-center", className)}>
      {icon ? (
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-slate-300">
          {icon}
        </div>
      ) : null}
      <h2 className="text-xl font-extrabold text-slate-100">{title}</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-gym-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

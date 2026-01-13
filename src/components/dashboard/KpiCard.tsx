import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  helperText?: string;
  icon: LucideIcon;
  iconColorClass?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  helperText,
  icon: Icon,
  iconColorClass = "text-primary bg-primary/15 shadow-sm",
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("bg-card border border-border rounded-2xl card-elevated hover-scale animate-fade-in transition-all hover:border-primary/40", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl text-xs",
            iconColorClass,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
        {helperText && (
          <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
        )}
      </CardContent>
    </Card>
  );
}

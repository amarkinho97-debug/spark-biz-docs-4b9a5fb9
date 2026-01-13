import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value = "", onChange, ...props }, ref) => {
    const formatCurrency = (rawValue: string): string => {
      // Remove all non-digits
      const digits = rawValue.replace(/\D/g, "");
      if (!digits) return "";
      
      // Convert to number (cents)
      const number = parseInt(digits, 10) / 100;
      
      // Format as Brazilian currency
      return number.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCurrency(e.target.value);
      onChange?.(formatted);
    };

    return (
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
          R$
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          ref={ref}
          className={cn(
            "flex h-14 w-full rounded-md border border-input bg-background pl-12 pr-3 py-2 text-2xl font-bold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
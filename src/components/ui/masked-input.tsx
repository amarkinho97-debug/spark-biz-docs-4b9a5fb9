import * as React from "react";
import { IMaskInput } from "react-imask";
import { cn } from "@/lib/utils";

interface MaskedInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  mask: string;
  value?: string;
  onAccept?: (value: string, mask: any) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, mask, onAccept, onChange, value, ...props }, ref) => {
    return (
      <IMaskInput
        mask={mask}
        value={value}
        unmask={false}
        onAccept={(value: string) => {
          onAccept?.(value, null);
          // Create a synthetic event for react-hook-form compatibility
          if (onChange) {
            const syntheticEvent = {
              target: { value, name: props.name },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
          }
        }}
        inputRef={ref as any}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        {...props}
      />
    );
  }
);

MaskedInput.displayName = "MaskedInput";

// CNPJ Mask: 00.000.000/0000-00
export const CNPJInput = React.forwardRef<HTMLInputElement, Omit<MaskedInputProps, "mask">>(
  (props, ref) => <MaskedInput mask="00.000.000/0000-00" {...props} ref={ref} />
);
CNPJInput.displayName = "CNPJInput";

// CPF Mask: 000.000.000-00
export const CPFInput = React.forwardRef<HTMLInputElement, Omit<MaskedInputProps, "mask">>(
  (props, ref) => <MaskedInput mask="000.000.000-00" {...props} ref={ref} />
);
CPFInput.displayName = "CPFInput";

// CNPJ/CPF dynamic mask
export const CNPJCPFInput = React.forwardRef<HTMLInputElement, Omit<MaskedInputProps, "mask">>(
  ({ value = "", onChange, className, maxLength, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value.replace(/\D/g, "").slice(0, 14);

      let formatted = rawValue;
      if (rawValue.length <= 11) {
        // CPF: 000.000.000-00
        formatted = rawValue
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      } else {
        // CNPJ: 00.000.000/0000-00
        formatted = rawValue
          .replace(/(\d{2})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1/$2")
          .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
      }

      const syntheticEvent = {
        ...event,
        target: { ...(event.target as any), value: formatted, name: props.name },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange?.(syntheticEvent);
    };

    return (
      <input
        ref={ref}
        value={value}
        onChange={handleChange}
        maxLength={maxLength ?? 18}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        {...props}
      />
    );
  }
);
CNPJCPFInput.displayName = "CNPJCPFInput";

// CEP Mask: 00000-000
export const CEPInput = React.forwardRef<HTMLInputElement, Omit<MaskedInputProps, "mask">>(
  (props, ref) => <MaskedInput mask="00000-000" {...props} ref={ref} />
);
CEPInput.displayName = "CEPInput";

// Phone Mask: (00) 00000-0000
export const PhoneInput = React.forwardRef<HTMLInputElement, Omit<MaskedInputProps, "mask">>(
  (props, ref) => <MaskedInput mask="(00) 00000-0000" {...props} ref={ref} />
);
PhoneInput.displayName = "PhoneInput";

export { MaskedInput };

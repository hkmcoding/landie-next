import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Input component with validation state variants.
 * 
 * @example
 * ```tsx
 * <Input placeholder="Enter text" />
 * 
 * <Input 
 *   defaultValue="john_doe"
 *   success={true}
 * />
 * 
 * <Input 
 *   defaultValue="invalid-email"
 *   error={true}
 * />
 * 
 * <Input 
 *   defaultValue="password123"
 *   warning={true}
 * />
 * ```
 */
interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  /** Whether to show error styling */
  error?: boolean
  /** Whether to show success styling */
  success?: boolean
  /** Whether to show warning styling */
  warning?: boolean
}

const inputVariants = cva(
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 paragraph shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:caption file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:caption focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "",
        error: "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50",
        success: "border-ring focus-visible:border-ring focus-visible:ring-ring/50",
        warning: "border-muted-foreground focus-visible:border-muted-foreground focus-visible:ring-muted-foreground/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, error, success, warning, ...props }, ref) => {
    // Determine variant based on props
    let finalVariant = variant
    if (error) finalVariant = "error"
    else if (success) finalVariant = "success"
    else if (warning) finalVariant = "warning"

    return (
      <input
        type={type}
        data-slot="input"
        className={cn(inputVariants({ variant: finalVariant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export { Input, inputVariants }

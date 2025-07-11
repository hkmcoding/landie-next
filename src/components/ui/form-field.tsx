"use client"

import * as React from "react"
import { Input } from "./input"
import { Label } from "./label"

/**
 * FormField component that wraps Input with validation states and messages.
 * Provides a clean API for form inputs with error, success, and warning states.
 * 
 * @example
 * ```tsx
 * <FormField
 *   label="Email"
 *   type="email"
 *   placeholder="Enter your email"
 * />
 * 
 * <FormField
 *   label="Username"
 *   defaultValue="john_doe"
 *   success="✓ Username is available"
 * />
 * 
 * <FormField
 *   label="Password"
 *   type="password"
 *   defaultValue="123"
 *   error="Password must be at least 8 characters"
 * />
 * 
 * <FormField
 *   label="Password"
 *   type="password"
 *   defaultValue="password123"
 *   warning="Consider adding uppercase, numbers, or symbols"
 * />
 * ```
 */
interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text displayed above the input */
  label?: string
  /** Error message displayed below the input (shows error styling) */
  error?: string
  /** Success message displayed below the input (shows success styling) */
  success?: string
  /** Warning message displayed below the input (shows warning styling) */
  warning?: string
  /** Description text displayed below the input (only shown when no error/success/warning) */
  description?: string
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ className, label, error, success, warning, description, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    
    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={inputId}>{label}</Label>
        )}
        <Input
          ref={ref}
          id={inputId}
          error={!!error}
          success={!!success}
          warning={!!warning}
          className={className}
          {...props}
        />
        {description && !error && !success && !warning && (
          <p className="text-description">{description}</p>
        )}
        {error && (
          <p className="text-error">{error}</p>
        )}
        {success && (
          <p className="text-success">{success}</p>
        )}
        {warning && (
          <p className="text-warning">{warning}</p>
        )}
      </div>
    )
  }
)

FormField.displayName = "FormField"

export { FormField } 
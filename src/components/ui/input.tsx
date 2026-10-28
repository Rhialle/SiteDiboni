import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[14px] border-[1.5px] border-input bg-white/90 px-3.5 py-1 text-base text-tinta transition-[border-color,box-shadow] duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#7d82a6] focus-visible:border-magenta focus-visible:ring-4 focus-visible:ring-magenta/15 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-lilas/60 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15",
        className
      )}
      {...props}
    />
  )
}

export { Input }

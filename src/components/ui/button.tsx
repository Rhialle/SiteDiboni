import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Botões de jogo (globals.css, .botao-jogo): brilho em cima e uma base que afunda no clique.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-clip-padding text-sm font-semibold whitespace-nowrap outline-none select-none focus-visible:ring-4 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-4 aria-invalid:ring-destructive/25 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "botao-jogo bg-linear-to-b from-magenta-clara to-magenta text-white",
        outline: "botao-jogo botao-claro bg-linear-to-b from-white to-[#f6f3fb] text-tinta",
        secondary: "botao-jogo botao-claro bg-linear-to-b from-[#f7f2fd] to-lilas text-tinta",
        ghost:
          "text-tinta transition-colors hover:bg-tinta/[0.06] aria-expanded:bg-tinta/[0.06]",
        destructive: "botao-jogo botao-perigo bg-linear-to-b from-[#e2525a] to-destructive text-white",
        link: "text-tinta underline underline-offset-4 hover:text-magenta",
      },
      size: {
        default:
          "h-11 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 text-[0.8125rem] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-6 text-[0.9375rem] has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-11",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

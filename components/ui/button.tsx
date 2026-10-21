import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center text-sm font-semibold whitespace-nowrap transition-all duration-100 ease-out outline-none select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-2 border-foreground shadow-[2.5px_2.5px_0px_0px_var(--color-foreground)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0px_0px_var(--color-foreground)] hover:bg-primary active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        outline:
          "bg-background text-foreground border-2 border-foreground shadow-[2.5px_2.5px_0px_0px_var(--color-foreground)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0px_0px_var(--color-foreground)] hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 active:shadow-none dark:hover:bg-muted/50",
        secondary:
          "bg-secondary text-secondary-foreground border-2 border-foreground shadow-[2.5px_2.5px_0px_0px_var(--color-foreground)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0px_0px_var(--color-foreground)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        ghost:
          "border-2 border-transparent hover:border-foreground hover:bg-muted hover:text-foreground hover:shadow-[2px_2px_0px_0px_var(--color-foreground)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none dark:hover:bg-muted/50",
        destructive:
          "bg-destructive text-destructive-foreground border-2 border-foreground shadow-[2.5px_2.5px_0px_0px_var(--color-foreground)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0px_0px_var(--color-foreground)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        link: "text-primary underline-offset-4 hover:underline font-semibold",
      },
      size: {
        default: "h-8 gap-1.5 px-3 rounded-md",
        xs: "h-6 gap-1 rounded-sm px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1.5 rounded-md px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-4 rounded-md text-base",
        icon: "size-8 rounded-md",
        "icon-xs": "size-6 rounded-sm [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-md",
        "icon-lg": "size-9 rounded-md",
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
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

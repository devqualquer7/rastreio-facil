import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva("group/badge inline-flex h-5 w-fit", { variants: { variant: { default: "bg-primary text-primary-foreground", secondary: "bg-secondary text-secondary-foreground", destructive: "bg-destructive/10 text-destructive", outline: "border-border text-foreground" } }, defaultVariants: { variant: "default" } })

function Badge({ className, variant = "default", render, ...props }: any) {
  return useRender({ defaultTagName: "span", props: mergeProps({ className: cn(badgeVariants({ variant }), className) }, props), render, state: { slot: "badge", variant } })
}

export { Badge, badgeVariants }

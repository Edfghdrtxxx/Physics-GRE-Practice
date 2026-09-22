You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
features-4.tsx
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { IconPlaceholder } from "@/components/ui/features-4-utils/icon-placeholder";

/** Props a call site may pass through to an icon. */
type IconProps = { className?: string; size?: number | string };

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
};

type FeatureTab = {
  value: string;
  label: string;
  features: Feature[];
};

const TABS: FeatureTab[] = [
  {
    value: "collaboration",
    label: "Collaboration",
    features: [
      {
        icon: (p: IconProps) => (
          <IconPlaceholder
            lucide="Group"
            tabler="IconUsers"
            hugeicons="GroupIcon"
            phosphor="Users"
            remixicon="RiGroupLine"
            {...p}
          />
        ),
        title: "Shared workspaces",
        description:
          "Bring every team into one workspace with granular roles and instant invites.",
      },
      {
        icon: (p: IconProps) => (
          <IconPlaceholder
            lucide="MessageCircle"
            tabler="IconMessageCircle"
            hugeicons="Message01Icon"
            phosphor="ChatCircle"
            remixicon="RiChat3Line"
            {...p}
          />
        ),
        title: "Inline comments",
        description:
          "Discuss changes in context with threaded comments, mentions, and reactions.",
      },
      {
        icon: (p: IconProps) => (
          <IconPlaceholder
            lucide="History"
            tabler="IconHistory"
            hugeicons="HistoryIcon"
            phosphor="ClockCounterClockwise"
            remixicon="RiHistoryLine"
            {...p}
          />
        ),
        title: "Version history",
        description:
          "Track every edit and restore any previous state with a single click.",
      },
    ],
  },
  {
    value: "automation",
    label: "Automation",
    features: [
      {
        icon: (p: IconProps) => (
          <IconPlaceholder
            lucide="Flashlight"
            tabler="IconBulb"
            hugeicons="FlashlightIcon"
            phosphor="Flashlight"
            remixicon="RiFlashlightLine"
            {...p}
          />
        ),
        title: "Visual workflows",
        description:
          "Chain triggers and actions on a drag-and-drop canvas, no code required.",
      },
      {
        icon: (p: IconProps) => (
          <IconPlaceholder
            lucide="Bot"
            tabler="IconRobot"
            hugeicons="RobotIcon"
            phosphor="Robot"
            remixicon="RiRobot2Line"
            {...p}
          />
        ),
        title: "Smart agents",
        description:
          "Let Acme agents triage requests, draft replies, and route work for you.",
      },
      {
        icon: (p: IconProps) => (
          <IconPlaceholder
            lucide="Timer"
            tabler="IconClockBolt"
            hugeicons="TimerIcon"
            phosphor="Timer"
            remixicon="RiTimerFlashLine"
            {...p}
          />
        ),
        title: "Scheduled runs",
        description:
          "Queue recurring jobs down to the minute with built-in retries and alerts.",
      },
    ],
  },
  {
    value: "security",
    label: "Security",
    features: [
      {
        icon: (p: IconProps) => (
          <IconPlaceholder
            lucide="ShieldCheck"
            tabler="IconShieldCheck"
            hugeicons="Shield01Icon"
            phosphor="ShieldCheck"
            remixicon="RiShieldCheckLine"
            {...p}
          />
        ),
        title: "SOC 2 Type II",
        description:
          "Independently audited controls keep your data compliant and protected.",
      },
      {
        icon: (p: IconProps) => (
          <IconPlaceholder
            lucide="Key"
            tabler="IconKey"
            hugeicons="KeyIcon"
            phosphor="Key"
            remixicon="RiKeyLine"
            {...p}
          />
        ),
        title: "SSO & SCIM",
        description:
          "Provision users through SAML, OIDC, and automated directory sync.",
      },
      {
        icon: (p: IconProps) => (
          <IconPlaceholder
            lucide="Fingerprint"
            tabler="IconFingerprint"
            hugeicons="FingerPrintIcon"
            phosphor="Fingerprint"
            remixicon="RiFingerprintLine"
            {...p}
          />
        ),
        title: "Audit logging",
        description:
          "Every action is timestamped, immutable, and exportable to your SIEM.",
      },
    ],
  },
];

export default function FeaturesBlock() {
  return (
    <section className="flex w-full items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col items-center text-center">
          <Badge variant="secondary" className="gap-1.5">
            <IconPlaceholder
              lucide="Braces"
              tabler="IconBraces"
              hugeicons="BracesIcon"
              phosphor="BracketsCurly"
              remixicon="RiBracesLine"
              data-icon="inline-start"
              className="size-3.5"
            />
            Built for teams
          </Badge>
          <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Everything you need to ship faster
          </h2>
          <p className="mt-3 max-w-xl text-pretty text-muted-foreground">
            Acme brings collaboration, automation, and enterprise-grade security
            together in one connected platform.
          </p>
        </div>

        <Tabs
          defaultValue="collaboration"
          className="mt-10 w-full items-center"
        >
          <TabsList className="h-auto flex-wrap gap-1 rounded-lg p-1">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-md px-4 py-1.5 text-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-8">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {tab.features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <Card
                      key={feature.title}
                      className="group h-full gap-4 p-6 transition-colors hover:border-primary/40"
                    >
                      <div
                        className={cn(
                          "flex size-11 items-center justify-center rounded-md",
                          "bg-primary/10 text-primary transition-colors",
                          "group-hover:bg-primary group-hover:text-primary-foreground",
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="font-heading text-base font-medium">
                          {feature.title}
                        </h3>
                        <p className="text-sm/relaxed text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                      <div className="mt-auto flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <IconPlaceholder
                          lucide="GitBranch"
                          tabler="IconGitBranch"
                          hugeicons="GitBranchIcon"
                          phosphor="GitBranch"
                          remixicon="RiGitBranchLine"
                          className="size-3.5"
                        />
                        Included on every plan
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}


demo.tsx
import FeaturesBlock from "@/components/ui/features-4";

export default function FeaturesDemo() {
  return <FeaturesBlock />;
}

```

Copy-paste these files for dependencies:
```tsx
shadcn/badge
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

```
```tsx
shadcn/card
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className,
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

```
```tsx
shadcn/tabs
"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className,
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

```
```tsx
shadcn/button
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }

```
```tsx
shadcn/input
import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

```
```tsx
shadcn/label
"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }

```

Install NPM dependencies:
```bash
class-variance-authority, @radix-ui/react-tabs, @radix-ui/react-slot, @radix-ui/react-label
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them

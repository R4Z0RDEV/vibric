import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    fullWidth?: boolean;
    withHeader?: boolean;
}

export function PageContainer({
    children,
    className,
    fullWidth = false,
    withHeader = false,
    ...props
}: PageContainerProps) {
    return (
        <div
            className={cn(
                "w-full bg-background min-h-full",
                // Vertical Rhythm & Spacing standard
                "p-6 md:p-10",
                // If there's a header, we might want less top padding, but usually consistent is better
                className
            )}
            {...props}
        >
            <div className={cn(
                "mx-auto",
                fullWidth ? "max-w-full" : "max-w-6xl", // Defines the 'Reading Width'
                "flex flex-col gap-8" // Default vertical rhythm
            )}>
                {children}
            </div>
        </div>
    );
}

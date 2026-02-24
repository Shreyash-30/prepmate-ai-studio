import React from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const PageTitle = ({ children, className, id }: TypographyProps) => (
  <h1 
    id={id}
    className={cn(
      "text-3xl font-semibold tracking-tight text-foreground transition-all duration-300",
      className
    )}
  >
    {children}
  </h1>
);

export const SectionTitle = ({ children, className, id }: TypographyProps) => (
  <h2 
    id={id}
    className={cn(
      "text-xl font-semibold tracking-tight text-foreground/90",
      className
    )}
  >
    {children}
  </h2>
);

export const CardTitle = ({ children, className, id }: TypographyProps) => (
  <h3 
    id={id}
    className={cn(
      "text-sm font-semibold text-foreground tracking-wide",
      className
    )}
  >
    {children}
  </h3>
);

export const BodyText = ({ children, className, id }: TypographyProps) => (
  <p 
    id={id}
    className={cn(
      "text-sm leading-relaxed text-foreground/80",
      className
    )}
  >
    {children}
  </p>
);

export const MutedText = ({ children, className, id }: TypographyProps) => (
  <p 
    id={id}
    className={cn(
      "text-sm text-muted-foreground font-medium",
      className
    )}
  >
    {children}
  </p>
);

export const CodeText = ({ children, className, id }: TypographyProps) => (
  <code 
    id={id}
    className={cn(
      "font-mono text-xs bg-muted px-1.5 py-0.5 rounded border border-border/50",
      className
    )}
  >
    {children}
  </code>
);

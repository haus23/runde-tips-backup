import { forwardRef } from 'react';
import { Button as AriaButton, type ButtonProps } from 'react-aria-components';

import { cn } from '~/utils/misc';

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <AriaButton
        className={cn(
          'inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 font-medium hover:bg-foreground/5',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export { Button };

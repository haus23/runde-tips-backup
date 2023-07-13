import { forwardRef, type InputHTMLAttributes } from 'react';
import { Input as AriaInput } from 'react-aria-components';

import { cn } from '~/utils/misc';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <AriaInput
        className={cn(
          'flex h-10 w-full rounded-md border px-3 py-2 text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';

export { Input };

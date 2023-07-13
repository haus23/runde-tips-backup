import { forwardRef, type LabelHTMLAttributes } from 'react';
import { Label as AriaLabel } from 'react-aria-components';

import { cn } from '~/utils/misc';

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <AriaLabel
        className={cn('text-base font-medium leading-none', className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Label.displayName = 'Input';

export { Label };

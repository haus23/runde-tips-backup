import {
  Text,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
import { Input } from './(ui)/input';
import { Label } from './(ui)/label';
import { cn } from '~/utils/misc';

type TextFieldProps = AriaTextFieldProps & {
  label: string;
  description?: string;
  errorMessage?: string;
};

const TextField = ({
  className,
  description,
  errorMessage,
  label,
  ...props
}: TextFieldProps) => {
  return (
    <AriaTextField
      {...props}
      className={cn('flex flex-col gap-y-2', className)}
    >
      <Label>{label}</Label>
      <Input className="invalid:border-invalid" />
      {description && !errorMessage && (
        <Text slot="description">{description}</Text>
      )}
      {errorMessage && (
        <Text className="text-invalid" slot="errorMessage">
          {errorMessage}
        </Text>
      )}
    </AriaTextField>
  );
};

// TextField.name = 'TextField';

export { TextField };

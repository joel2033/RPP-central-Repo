import React, { memo } from 'react';
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface BaseFieldProps {
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

interface TextFieldProps extends BaseFieldProps {
  type: 'text' | 'email' | 'tel' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

interface TextareaFieldProps extends BaseFieldProps {
  type: 'textarea';
  placeholder?: string;
  rows?: number;
  value?: string;
  onChange?: (value: string) => void;
}

interface SelectFieldProps extends BaseFieldProps {
  type: 'select';
  placeholder?: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
}

interface CheckboxFieldProps extends BaseFieldProps {
  type: 'checkbox';
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

type FormFieldProps = TextFieldProps | TextareaFieldProps | SelectFieldProps | CheckboxFieldProps;

export const FormField = memo(({ 
  label, 
  description, 
  required, 
  disabled, 
  className,
  ...props 
}: FormFieldProps) => {
  const renderField = () => {
    switch (props.type) {
      case 'textarea':
        return (
          <Textarea
            placeholder={props.placeholder}
            rows={props.rows || 3}
            value={props.value || ''}
            onChange={(e) => props.onChange?.(e.target.value)}
            disabled={disabled}
            className={cn('resize-none', className)}
          />
        );
      
      case 'select':
        return (
          <Select value={props.value} onValueChange={props.onChange} disabled={disabled}>
            <SelectTrigger className={className}>
              <SelectValue placeholder={props.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {props.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={label}
              checked={props.checked}
              onCheckedChange={props.onChange}
              disabled={disabled}
            />
            {label && (
              <label
                htmlFor={label}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </label>
            )}
          </div>
        );
      
      default:
        return (
          <Input
            type={props.type}
            placeholder={props.placeholder}
            value={props.value || ''}
            onChange={(e) => props.onChange?.(e.target.value)}
            disabled={disabled}
            className={className}
          />
        );
    }
  };

  if (props.type === 'checkbox') {
    return (
      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
        <FormControl>
          {renderField()}
        </FormControl>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    );
  }

  return (
    <FormItem>
      {label && (
        <FormLabel>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FormLabel>
      )}
      <FormControl>
        {renderField()}
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
});

FormField.displayName = 'FormField';
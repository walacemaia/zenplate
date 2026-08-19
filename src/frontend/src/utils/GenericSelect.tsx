import type { Control } from 'react-hook-form';

import React from 'react';
import { useController } from 'react-hook-form';

import { TextField, Autocomplete } from '@mui/material';

interface GenericSelectProps<T> {
  title: string;
  name: string;
  control: Control<any>;
  fetchOptions: () => Promise<T[]>;
  getOptionLabel: (option: T) => string;
  getOptionValue: (option: T) => bigint;
  multiple?: boolean;
  disabled?: boolean;
}

export default function GenericSelect<T extends { id: bigint }>({
  title,
  name,
  control,
  fetchOptions,
  getOptionLabel,
  getOptionValue,
  multiple = false,
  disabled = false,
}: GenericSelectProps<T>) {
  const { field, fieldState } = useController({ name, control });

  const [options, setOptions] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        const data = await fetchOptions();
        setOptions(data);
      } finally {
        setLoading(false);
      }
    };
    loadOptions();
  }, [fetchOptions]);

  return (
    <Autocomplete
      multiple={multiple}
      disableCloseOnSelect={multiple}
      filterSelectedOptions={multiple}
      options={options}
      loading={loading}
      disabled={disabled}
      value={
        (() => {
          if (multiple) {
            const selectedIds = Array.isArray(field.value) ? (field.value as bigint[]) : [];
            return options.filter((item) => selectedIds.includes(getOptionValue(item)));
          }
          return field.value && field.value !== 0n
            ? options.find((item) => getOptionValue(item) === field.value) || null
            : null;
        })() as any
      }
      onChange={(_, newValue) => {
        if (multiple) {
          const selected = Array.isArray(newValue) ? (newValue as T[]) : [];
          field.onChange(selected.map((item) => getOptionValue(item)));
          return;
        }
        field.onChange(newValue ? getOptionValue(newValue as T) : 0n);
      }}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={(option, value) => getOptionValue(option) === getOptionValue(value)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={title}
          disabled={disabled}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
        />
      )}
    />
  );
}

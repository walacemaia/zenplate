import React from 'react';
import { useController } from 'react-hook-form';

import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

type VariantOption<T> = {
  label: string;
  value: T;
};

type GenericSelectVariantProps<T> = {
  title: string;
  name: string;
  control: any;
  fetchOptions: () => Promise<VariantOption<T>[]>;
  getOptionLabel: (option: VariantOption<T>) => string;
  getOptionValue: (option: VariantOption<T>) => string;
  disabled?: boolean;
};

export default function GenericSelectVariant<T>({
  title,
  name,
  control,
  fetchOptions,
  getOptionLabel,
  getOptionValue,
  disabled = false,
}: GenericSelectVariantProps<T>) {
  const { field, fieldState } = useController({ name, control });

  const [options, setOptions] = React.useState<VariantOption<T>[]>([]);
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
  }, []);

  return (
    <Autocomplete
      options={options}
      loading={loading}
      disabled={disabled}
      value={
        field.value
          ? options.find(
              (item) => getOptionValue(item) === getOptionValue({ label: '', value: field.value })
            ) || null
          : null
      }
      onChange={(_, newValue) => field.onChange(newValue ? newValue.value : null)}
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

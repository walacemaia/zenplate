import type { ConfigurationType } from 'src/icpadapters/ConfigurationAdapter';

import { z as zod } from 'zod';
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { BLANK_CONFIGURATION } from 'src/icpadapters/ConfigurationAdapter';

import { Form } from 'src/components/hook-form';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

/* -------------------------------------------------------------------------- */
/*                            Esquema de validação                            */
/* -------------------------------------------------------------------------- */
const toBigInt = (v: unknown) => {
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') return BigInt(v);
  if (typeof v === 'string') return v.trim() === '' ? 0n : BigInt(v);
  return 0n;
};

type ConfigurationFormValues = {
  id: bigint;
  lastChange: bigint;
  logLevel: string;
  maxProfileImageSize: bigint;
  eventsForCacheWarmup: bigint;
};

const defaultValues: ConfigurationFormValues = {
  ...BLANK_CONFIGURATION,
};

/* -------------------------------------------------------------------------- */
/*                                 Formulário                                 */
/* -------------------------------------------------------------------------- */
type ConfigurationFormProps = {
  objectToEdit: ConfigurationType;
  onSave: (object: ConfigurationType) => void;
  onCancel: () => void;
  onEdit: () => void;
  readonly: boolean;
};

export default function ConfigurationForm({
  objectToEdit,
  onSave,
  onCancel,
  onEdit,
  readonly,
}: ConfigurationFormProps) {
  const { translations: t } = useIcpContext();

  const schema = React.useMemo(
    () =>
      zod.object({
        id: zod.bigint(),
        lastChange: zod.bigint(),
        logLevel: zod
          .string()
          .min(1, { message: t('configurationLogLevelRequired') || 'Nível de log é obrigatório.' }),
        maxProfileImageSize: zod.preprocess(
          toBigInt,
          zod.bigint().refine((v) => v > 0n, {
            message:
              t('configurationMaxProfileImageSizePositive') ||
              'Tamanho máximo da imagem de perfil deve ser positivo.',
          })
        ),
        eventsForCacheWarmup: zod.preprocess(
          toBigInt,
          zod.bigint().refine((v) => v > 0n, {
            message:
              t('configurationEventsForCacheWarmupPositive') ||
              'Eventos para aquecimento de cache deve ser positivo.',
          })
        ),
      }),
    [t]
  );

  const [saving, setSaving] = useState(false);
  const shouldSubmitRef = React.useRef(false);

  const methods = useForm<ConfigurationFormValues>({
    mode: 'onSubmit',
    resolver: zodResolver(schema),
    values: objectToEdit,
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
    reset,
  } = methods;

  // Sempre que o objeto mudar (ex.: recarga após cancelar), reseta o form
  React.useEffect(() => {
    reset(objectToEdit);
  }, [objectToEdit, reset]);

  const onSubmit = handleSubmit(async (data) => {
    // Salva apenas se veio do botão "Salvar" (ou Enter em modo edição)
    if (!shouldSubmitRef.current || readonly) {
      shouldSubmitRef.current = false;
      return;
    }
    try {
      setSaving(true);
      await onSave(data as ConfigurationType);
    } finally {
      setSaving(false);
      shouldSubmitRef.current = false;
    }
  });

  const logLevelOptions = [
    { value: 'error', label: 'Error' },
    { value: 'warning', label: 'Warning' },
    { value: 'info', label: 'Info' },
    { value: 'deb', label: 'Debug' },
  ];

  /* -------------------------------------------------------------------------- */
  /*                                Renderização                                */
  /* -------------------------------------------------------------------------- */
  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 12 }}>
          <Card sx={{ p: 3 }}>
            <Box
              sx={{
                rowGap: 3,
                columnGap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
              }}
            >
              <Controller
                name="logLevel"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    select
                    label={t('logLevel') || 'Log Level'}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={readonly}
                    fullWidth
                  >
                    {logLevelOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              <Controller
                name="maxProfileImageSize"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    value={field.value !== undefined ? field.value.toString() : ''}
                    onChange={(e) => field.onChange(toBigInt(e.target.value))}
                    label={t('maxProfileImageSize') || 'Max Profile Image Size (bytes)'}
                    type="number"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={readonly}
                    fullWidth
                  />
                )}
              />

              <Controller
                name="eventsForCacheWarmup"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    value={field.value !== undefined ? field.value.toString() : ''}
                    onChange={(e) => field.onChange(toBigInt(e.target.value))}
                    label={t('eventsForCacheWarmup') || 'Events for Cache Warmup'}
                    type="number"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={readonly}
                    fullWidth
                  />
                )}
              />
            </Box>

            <Stack sx={{ mt: 3, justifyContent: 'flex-end' }} direction="row" spacing={2}>
              {readonly ? (
                <Button variant="contained" color="primary" type="button" onClick={onEdit}>
                  {t('edit')}
                </Button>
              ) : (
                <>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmitting || saving}
                    onClick={() => {
                      // Marca intenção de salvar antes do submit
                      shouldSubmitRef.current = true;
                    }}
                  >
                    {saving ? t('saving') || 'Salvando...' : t('save')}
                  </Button>
                  <Button variant="outlined" color="secondary" onClick={onCancel}>
                    {t('cancel')}
                  </Button>
                </>
              )}
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}

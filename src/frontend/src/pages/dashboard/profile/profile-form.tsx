import React from 'react';
import { z as zod } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ListItemText from '@mui/material/ListItemText';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { InputLabel, IconButton, FormControl, InputAdornment } from '@mui/material';

import { useAlert } from 'src/utils/Alert';

import { Form, Field, schemaHelper } from 'src/components/hook-form';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

import { BLANK_PROFILE } from '../../../icpadapters/ProfileAdapter';

import type { ProfileType } from '../../../icpadapters/ProfileAdapter';

/* -------------------------------------------------------------------------- */
/*                            Esquema de validação                            */
/* -------------------------------------------------------------------------- */
type ProfileFormValues = {
  id: bigint;
  lastChange: bigint;
  userName: string;
  displayName: string | null;
  userBio: string | null;
  principal: string;
  language: string;
  avatar: string | null;
  email: string | null;
  country: string | null;
  role: string;
};

const defaultValues: ProfileFormValues = {
  ...BLANK_PROFILE,
};

/* -------------------------------------------------------------------------- */
/*                   Definição das opções de idioma com bandeiras             */
/* -------------------------------------------------------------------------- */
const languageOptions = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'ptbr', label: 'Português', flag: '🇧🇷' },
];

/* -------------------------------------------------------------------------- */
/*                                 Formulário                                 */
/* -------------------------------------------------------------------------- */
type ProfileFormProps = {
  objectToEdit: ProfileType;
  onSave: (object: ProfileType) => void;
  onCancel: () => void;
  onEdit: () => void;
  readonly: boolean;
};

export default function ProfileForm({
  objectToEdit,
  onSave,
  onCancel,
  onEdit,
  readonly,
}: ProfileFormProps) {
  const { translations: t, loadTranslations, backend } = useIcpContext();
  const { showSuccess, showError } = useAlert();
  const [maxProfileImageSize, setMaxProfileImageSize] = React.useState<number>(200 * 1024);

  const schema = React.useMemo(
    () =>
      zod.object({
        id: zod.bigint(),
        lastChange: zod.bigint(),
        userName: zod
          .string()
          .min(1, { message: t('profileUserNameRequired') || 'User name is required!' }),
        displayName: zod.string().nullable(),
        userBio: zod.string().nullable(),
        principal: zod.string(),
        language: zod.string(),
        avatar: zod.string().nullable(),
        email: schemaHelper.nullableInput(
          zod
            .string()
            .min(1, { message: t('profileEmailRequired') || 'Email is required!' })
            .email({ message: t('invalidEmailAddress') || 'Email must be a valid email address!' })
        ),
        country: zod.string().nullable(),
        role: zod.string(),
      }),
    [t]
  );

  const methods = useForm<ProfileFormValues>({
    mode: 'onSubmit',
    resolver: zodResolver(schema),
    defaultValues,
    values: objectToEdit,
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = methods;

  // Carrega configuração para obter limite de imagem
  React.useEffect(() => {
    (async () => {
      try {
        const cfg = await backend.getConfiguration();
        // cfg.maxProfileImageSize é Nat (bigint) do did -> cast para number com segurança até ~2GB
        const limit = Number(cfg.maxProfileImageSize);
        if (!Number.isNaN(limit) && limit > 0) {
          setMaxProfileImageSize(limit);
        }
      } catch (e) {
        console.error('Erro ao carregar configuração:', e);
      }
    })();
  }, [backend]);

  // Sempre que o objeto mudar (ex.: recarga após cancelar), reseta o form
  React.useEffect(() => {
    methods.reset(objectToEdit);
  }, [objectToEdit, methods]);

  const avatar = watch('avatar');
  const principal = watch('principal');

  /* -------------------------------------------------------------------------- */
  /*                            Função para upload                             */
  /* -------------------------------------------------------------------------- */
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Valida tamanho
    if (file.size > maxProfileImageSize) {
      showError(
        t('profileAvatarSizeExceeded') + ' (' + maxProfileImageSize + ' bytes)' ||
          'Image size exceeds the allowed limit: ' + maxProfileImageSize + ' bytes'
      );
      // Limpa input para permitir novo upload
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result?.toString().split(',')[1] || null;
      setValue('avatar', base64String);
    };
  };

  /* -------------------------------------------------------------------------- */
  /*                         Função para copiar Principal                       */
  /* -------------------------------------------------------------------------- */
  const handleCopyPrincipal = async () => {
    try {
      // Fallback para cópia que funciona em qualquer contexto
      const textArea = document.createElement('textarea');
      textArea.value = principal;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        showSuccess(t('principalCopied') || 'Principal copied!');
      }
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                                Submissão                                   */
  /* -------------------------------------------------------------------------- */
  const onSubmit = handleSubmit(async (data) => {
    await onSave(data as ProfileType);
    loadTranslations();
    // Notifica que o profile foi atualizado (para forçar recarregamento em outros locais)
    window.dispatchEvent(new Event('profile:updated'));
  });

  /* -------------------------------------------------------------------------- */
  /*                                Renderização                                */
  /* -------------------------------------------------------------------------- */
  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card sx={{ p: 4 }}>
            {/* ✅ Seção do Avatar no topo */}
            <Stack alignItems="center" spacing={2} sx={{ mb: 3 }}>
              <Avatar
                src={avatar ? `data:image/png;base64,${avatar}` : undefined}
                sx={{ width: 120, height: 120 }}
              />
              {!readonly && (
                <Stack direction="row" spacing={2}>
                  <Button variant="contained" color="primary" component="label">
                    {t('profileUploadAvatar')}
                    <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
                  </Button>
                  {avatar && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => setValue('avatar', null)}
                    >
                      {t('profileRemoveAvatar')}
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>

            <Box
              sx={{
                rowGap: 3,
                columnGap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              }}
            >
              <Field.Text name="userName" label={t('profileUserName')} disabled={readonly} />
              <Field.Text name="displayName" label={t('profileDisplayName')} disabled={readonly} />
              <Field.Text name="email" label={t('profileEmail')} disabled={readonly} />
              <Field.CountrySelect
                fullWidth
                name="country"
                label={t('profileCountry')}
                placeholder={t('profileChooseCountry')}
                disabled={readonly}
              />
              <TextField
                name="principal"
                label={t('profilePrincipal') || 'Principal'}
                value={principal}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleCopyPrincipal} edge="end">
                        <ContentCopyIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel id="language-label" shrink>
                  {t('profileLanguage')}
                </InputLabel>
                <Controller
                  name="language"
                  control={methods.control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      labelId="language-label"
                      id="language"
                      label={t('profileLanguage')}
                      fullWidth
                      disabled={readonly}
                    >
                      {languageOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          <ListItemText primary={option.label} />
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Controller
                name="userBio"
                control={methods.control}
                render={({ field }) => (
                  <TextField
                    label={t('profileUserBio')}
                    multiline
                    minRows={4}
                    fullWidth
                    disabled={readonly}
                    {...field}
                  />
                )}
              />
            </Box>

            {/* Botões */}
            {!readonly && (
              <Stack sx={{ mt: 4, justifyContent: 'flex-end' }} direction="row" spacing={2}>
                <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                  {objectToEdit.id == 0n ? t('create') : t('save')}
                </Button>
                <Button variant="outlined" color="secondary" onClick={onCancel}>
                  {t('cancel')}
                </Button>
              </Stack>
            )}
            {readonly && (
              <Stack sx={{ mt: 4, justifyContent: 'flex-end' }} direction="row" spacing={2}>
                <Button variant="contained" color="primary" onClick={onEdit}>
                  {t('edit')}
                </Button>
              </Stack>
            )}
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}

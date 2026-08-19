import type { ProfileType } from 'src/icpadapters/ProfileAdapter';

import React from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

type SimpleProfileFormProps = {
  profile: ProfileType;
  onSave: (data: ProfileType) => void;
  onCancel: () => void;
  translations: { [key: string]: string };
};

export function SimpleProfileForm({
  profile,
  onSave,
  onCancel,
  translations,
}: SimpleProfileFormProps) {
  const [userName, setUserName] = React.useState(profile.userName || '');
  const [displayName, setDisplayName] = React.useState(profile.displayName || '');
  const [email, setEmail] = React.useState(profile.email || '');
  const [language, setLanguage] = React.useState(profile.language || 'en');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...profile,
      userName,
      displayName,
      email,
      language,
    });
  };

  const t = (key: string) => translations[key] || key;

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2} sx={{ pt: 2 }}>
        <TextField
          label={t('profileUserName')}
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label={t('profileDisplayName')}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          fullWidth
        />
        <TextField
          label={t('profileEmail')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
        />
        <TextField
          select
          label={t('profileLanguage')}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          fullWidth
        >
          <MenuItem value="en">English</MenuItem>
          <MenuItem value="ptbr">Português (Brasil)</MenuItem>
        </TextField>
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button type="submit" variant="contained" color="primary">
            {t('create')}
          </Button>
          <Button variant="outlined" color="secondary" onClick={onCancel}>
            {t('cancel')}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}

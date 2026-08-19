import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import DeleteIcon from '@mui/icons-material/Delete';
import ShieldIcon from '@mui/icons-material/Security';
import AddModeratorIcon from '@mui/icons-material/AddModerator';
import RemoveModeratorIcon from '@mui/icons-material/RemoveModerator';

import EntityRecordCard from 'src/components/card/entity-record-card';

type ProfileCardProps = {
  profile: {
    userName: string;
    displayName?: string | null;
    email?: string | null;
    country?: string | null;
    principal: string;
    isAdmin: boolean;
    isController: boolean;
  };
  onPromote: () => void;
  onDemote: () => void;
  onDelete: () => void;
  t: (key: string) => string;
};

export default function ProfileCard({
  profile,
  onPromote,
  onDemote,
  onDelete,
  t,
}: ProfileCardProps) {
  const isAdmin = profile.isAdmin;

  return (
    <EntityRecordCard
      title={profile.userName}
      subtitle={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <ShieldIcon color={isAdmin ? 'primary' : 'disabled'} fontSize="small" />
            {isAdmin ? 'Admin' : 'User'}
          </Box>
          {profile.isController ? (
            <Chip size="small" color="warning" variant="filled" label="Controller" />
          ) : null}
        </Box>
      }
      fields={[
        { label: t('profileDisplayName') || 'Nome de exibição', value: profile.displayName || '-' },
        { label: t('profileEmail') || 'E-mail', value: profile.email || '-' },
        { label: t('profileCountry') || 'País', value: profile.country || '-' },
        { label: 'PrincipalId', value: profile.principal },
      ]}
      actions={[
        <Button
          key="promote"
          size="small"
          startIcon={<AddModeratorIcon />}
          onClick={onPromote}
          disabled={isAdmin}
        >
          {t('promote') || 'Promover'}
        </Button>,
        <Button
          key="demote"
          size="small"
          startIcon={<RemoveModeratorIcon />}
          onClick={onDemote}
          disabled={!isAdmin}
        >
          {t('demote') || 'Rebaixar'}
        </Button>,
        <Button
          key="delete"
          size="small"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={onDelete}
        >
          {t('delete') || 'Excluir'}
        </Button>,
      ]}
    />
  );
}

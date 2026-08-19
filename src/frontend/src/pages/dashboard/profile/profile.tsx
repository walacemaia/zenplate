
import type { ProfileType } from 'src/icpadapters/ProfileAdapter';

import React from 'react';

import { paths } from 'src/routes/paths';

import { useAlert } from 'src/utils/Alert';

import { DashboardContent } from 'src/layouts/dashboard/content';
import { icpToTs, tsToIcp } from 'src/icpadapters/ProfileAdapter';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

import ProfileForm from './profile-form';

export default function Page() {
  const [object, setObject] = React.useState<ProfileType | undefined>(undefined);
  const { showError, showSuccess } = useAlert();
  const { backend, translations: t } = useIcpContext();
  const [editing, setEditing] = React.useState(false);

  const loadProfile = React.useCallback(async () => {
    const myProf = (await backend.getMyProfile())[0] || undefined;
    setObject(icpToTs(myProf));
  }, [backend]);

  // Carga dos dados ao entrar na página.
  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /**
   * Salva o objeto informado.
   * @param obj objeto a ser salvo.
   */
  async function updateAction(obj: ProfileType) {
    console.log('Update action:', obj);
    const result = await backend.updateMyProfile(tsToIcp(obj));
    if ('ok' in result) {
      showSuccess(t('registerSuccessfullyUpdated'));
      setObject(icpToTs(result.ok));
      setEditing(false);
    } else {
      const err = result.err.join(', ');
      showError(err);
    }
  }

  async function cancelAction() {
    setEditing(false);
    await loadProfile(); // recarrega ao sair do modo edição
  }

  async function editAction() {
    setEditing(true);
    await loadProfile(); // recarrega ao entrar no modo edição (garante dados atualizados)
  }

  const editProfile = t('edit') + ' ' + t('profile');

  return object ? (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={editProfile}
        links={[
          { name: t('dashboard'), href: paths.dashboard.home },
          { name: t('profile'), href: paths.dashboard.profile },
          { name: editProfile },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <ProfileForm
        key={object.lastChange?.toString() ?? object.id.toString()}
        objectToEdit={object}
        onSave={updateAction}
        onCancel={cancelAction}
        onEdit={editAction}
        readonly={!editing}
      />
    </DashboardContent>
  ) : (
    <p>{t('loading')}</p>
  );
}

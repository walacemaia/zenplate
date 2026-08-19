import React from 'react';
import { Helmet } from 'react-helmet-async';

import { paths } from 'src/routes/paths';

import { useAlert } from 'src/utils/Alert';

import { DashboardContent } from 'src/layouts/dashboard';
import { executeBackendAction } from 'src/icpadapters/BackendUtils';
import { icpToTs, tsToIcp, type ConfigurationType } from 'src/icpadapters/ConfigurationAdapter';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

import ConfigurationForm from './configuration-form';

export default function Page() {
  const { backend, translations: t } = useIcpContext();
  const { showError, showSuccess } = useAlert();
  const [configuration, setConfiguration] = React.useState<ConfigurationType | null>(null);
  const [readonly, setReadonly] = React.useState(true);

  const loadConfiguration = React.useCallback(async () => {
    const config = await backend.getConfiguration();
    console.log('Loaded configuration:', config);
    setConfiguration(icpToTs(config));
  }, [backend]);

  React.useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  //   async function loadConfiguration() {
  //     try {
  //       const config = await backend.getConfiguration();
  //       console.log('Loaded configuration:', config);
  //       setConfiguration(icpToTs(config));
  //     } catch (e) {
  //       showError(String(e));
  //     }
  //   }

  async function handleSave(data: ConfigurationType) {
    await executeBackendAction(
      () => backend.updateConfiguration(tsToIcp(data)),
      t('registerSuccessfullyUpdated'),
      () => {
        setConfiguration(data);
        setReadonly(true);
      },
      showSuccess,
      showError
    );
  }

  function handleEdit() {
    setReadonly(false);
  }

  async function handleCancel() {
    setReadonly(true);
    await loadConfiguration();
  }

  const title = t('configuration') || 'Configuration';

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>

      <DashboardContent>
        <CustomBreadcrumbs
          heading={title}
          links={[
            { name: t('dashboard'), href: paths.dashboard.home },
            { name: t('admin'), href: paths.admin.configuration },
            { name: title },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        {configuration ? (
          <ConfigurationForm
            objectToEdit={configuration}
            onSave={handleSave}
            onCancel={handleCancel}
            onEdit={handleEdit}
            readonly={readonly}
          />
        ) : (
          <p>{t('loading')}</p>
        )}
      </DashboardContent>
    </>
  );
}

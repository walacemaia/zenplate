import type { NavSectionProps } from 'src/components/nav-section';

import React from 'react';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { SvgColor } from 'src/components/svg-color';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

const ICONS = {
  job: icon('ic-job'),
  blog: icon('ic-blog'),
  chat: icon('ic-chat'),
  mail: icon('ic-mail'),
  user: icon('ic-user'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  tour: icon('ic-tour'),
  order: icon('ic-order'),
  label: icon('ic-label'),
  blank: icon('ic-blank'),
  kanban: icon('ic-kanban'),
  folder: icon('ic-folder'),
  course: icon('ic-course'),
  banking: icon('ic-banking'),
  booking: icon('ic-booking'),
  invoice: icon('ic-invoice'),
  product: icon('ic-product'),
  calendar: icon('ic-calendar'),
  disabled: icon('ic-disabled'),
  external: icon('ic-external'),
  menuItem: icon('ic-menu-item'),
  ecommerce: icon('ic-ecommerce'),
  analytics: icon('ic-analytics'),
  dashboard: icon('ic-dashboard'),
  parameter: icon('ic-parameter'),
  token: icon('ic-banking'),
  reward: icon('ic-label'),
};

// ----------------------------------------------------------------------

export const useNavData = (): NavSectionProps['data'] => {
  const { translations: t } = useIcpContext();
  //const { t } = useTranslation(); // ✅ Hook de tradução
  const { backend } = useIcpContext();

  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);

  // Ao alterar o profile, atualiza o isAdmin para refletir no menu
  React.useEffect(() => {
    // O administrador verá itens adicionais no menu
    const loadAdminStatus = async () => {
      setIsAdmin(await backend.isAdmin());
    };
    loadAdminStatus();

    // Listener para atualizar quando o profile for salvo
    const handler = async () => {
      loadAdminStatus();
    };
    window.addEventListener('profile:updated', handler);
    return () => window.removeEventListener('profile:updated', handler);
  }, [backend]);

  const sections = [
    /**
     * Overview
     */
    {
      subheader: t('overview'),
      items: [
        {
          title: t('home'),
          path: paths.dashboard.home,
          icon: ICONS.user,
        },
        { title: t('profile'), path: paths.dashboard.profile, icon: ICONS.user },
      ],
    },
    ...(isAdmin
      ? [
          {
            subheader: t('admin'),
            items: [
              {
                title: t('repositoryStats'),
                path: paths.admin.repostatus,
                icon: ICONS.lock,
              },
              {
                title: t('profilePlural'),
                path: paths.admin.profiles,
                icon: ICONS.user,
              },
              {
                title: t('configuration'),
                path: paths.admin.configuration,
                icon: ICONS.parameter,
              },
              {
                title: t('backup'),
                path: paths.admin.backup,
                icon: ICONS.folder,
              },
            ],
          },
        ]
      : []),
  ];
  return sections;
};

import { Card, Stack, Typography, CardContent } from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

export default function Page() {
  const { translations: t } = useIcpContext();

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('overview') || 'Visão Geral'}
      </Typography>

      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary">
              Este é o template base do ecossistema icp-workspace — adicione aqui o conteúdo do
              dashboard específico do seu projeto.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </DashboardContent>
  );
}

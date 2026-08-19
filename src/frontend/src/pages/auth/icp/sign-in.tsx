import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/global-config';

import { IcpSignInView } from 'src/auth/view/icp';

// ----------------------------------------------------------------------

const metadata = { title: `Sign in | ICP - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <IcpSignInView />
    </>
  );
}

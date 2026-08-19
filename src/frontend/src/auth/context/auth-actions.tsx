import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

export function SignOut() {
  // ICP
  const { logout: icpLogout } = useIcpContext();
  icpLogout();
}

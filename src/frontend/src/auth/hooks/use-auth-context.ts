import { useIcpContext as useAuthII } from '../context/icp/icp-context-provider';

// ----------------------------------------------------------------------

export function useAuthContext() {
  const context = useAuthII();

  if (!context) {
    throw new Error('useAuthContext: Context must be used inside AuthProvider');
  }

  return context;
}

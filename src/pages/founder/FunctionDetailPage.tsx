import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FounderTabLayout } from '@/components/founder/FounderTabLayout';
import { FounderFunctionDetail } from '@/components/founder/FounderFunctionDetail';
import { getFounderFunction, isFounderFunctionKey } from '@/config/founderFunctions';

export default function FunctionDetailPage() {
  const navigate = useNavigate();
  const { functionKey } = useParams<{ functionKey: string }>();
  const valid = !!functionKey && isFounderFunctionKey(functionKey);

  useEffect(() => {
    if (!valid) navigate('/manage', { replace: true });
  }, [valid, navigate]);

  if (!valid) return null;
  const config = getFounderFunction(functionKey)!;

  return (
    <FounderTabLayout title={config.label} subtitle="System & status" onBack={() => navigate('/manage')}>
      <FounderFunctionDetail functionKey={functionKey} />
    </FounderTabLayout>
  );
}

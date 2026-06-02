import { FounderTabLayout } from '@/components/founder/FounderTabLayout';
import { FounderFunctionDetail } from '@/components/founder/FounderFunctionDetail';

export default function Marketing() {
  return (
    <FounderTabLayout title="Marketing" subtitle="Find more customers">
      <FounderFunctionDetail functionKey="marketing" />
    </FounderTabLayout>
  );
}

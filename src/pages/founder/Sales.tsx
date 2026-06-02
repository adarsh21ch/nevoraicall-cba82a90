import { FounderTabLayout } from '@/components/founder/FounderTabLayout';
import { FounderFunctionDetail } from '@/components/founder/FounderFunctionDetail';

export default function Sales() {
  return (
    <FounderTabLayout title="Sales" subtitle="Close more deals">
      <FounderFunctionDetail functionKey="sales" />
    </FounderTabLayout>
  );
}

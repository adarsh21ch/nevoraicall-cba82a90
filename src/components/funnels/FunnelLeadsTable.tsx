import { FunnelLead } from '@/types/funnels';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { CheckCircle, Clock, XCircle, Phone, Mail } from 'lucide-react';

interface FunnelLeadsTableProps {
  leads: FunnelLead[];
  isLoading?: boolean;
}

export function FunnelLeadsTable({ leads, isLoading }: FunnelLeadsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No leads yet. Share your funnel to start collecting leads!</p>
      </div>
    );
  }

  const getPaymentBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Watch Progress</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium">{lead.name}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {lead.phone && (
                    <span className="flex items-center gap-1 text-sm">
                      <Phone className="w-3 h-3" />
                      {lead.phone}
                    </span>
                  )}
                  {lead.email && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {lead.email}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={lead.video_watch_percent || 0} 
                    className="w-20 h-2"
                  />
                  <span className="text-sm text-muted-foreground w-12">
                    {Math.round(lead.video_watch_percent || 0)}%
                  </span>
                  {lead.video_completed && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                {getPaymentBadge(lead.payment_status_cache)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(lead.created_at), 'MMM d, yyyy')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

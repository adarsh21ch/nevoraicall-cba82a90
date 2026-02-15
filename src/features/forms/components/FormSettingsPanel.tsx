import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { UpdateFormInput } from '../types';

interface Props {
  settings: UpdateFormInput;
  onChange: (settings: UpdateFormInput) => void;
}

export function FormSettingsPanel({ settings, onChange }: Props) {
  const update = (partial: Partial<UpdateFormInput>) => onChange({ ...settings, ...partial });

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold">General Settings</h3>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Who can access this form?</Label>
        <Select
          value={settings.is_accepting ? 'public' : 'closed'}
          onValueChange={v => update({ is_accepting: v === 'public' })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public — Anyone with the link</SelectItem>
            <SelectItem value="closed">Closed — Not accepting responses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Allow multiple submissions</Label>
          <p className="text-xs text-muted-foreground">Users can submit more than once</p>
        </div>
        <Switch checked={settings.allow_multiple_submissions ?? true} onCheckedChange={v => update({ allow_multiple_submissions: v })} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Track traffic sources (UTM)</Label>
          <p className="text-xs text-muted-foreground">Track Meta / Google Ads sources</p>
        </div>
        <Switch checked={settings.collect_utm ?? false} onCheckedChange={v => update({ collect_utm: v })} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Allow embedding</Label>
          <p className="text-xs text-muted-foreground">Enable iframe embed on websites</p>
        </div>
        <Switch checked={settings.embed_enabled ?? false} onCheckedChange={v => update({ embed_enabled: v })} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Max submissions</Label>
        <Input
          type="number"
          value={settings.max_submissions || ''}
          onChange={e => update({ max_submissions: e.target.value ? parseInt(e.target.value) : null })}
          placeholder="Unlimited"
        />
        <p className="text-xs text-muted-foreground">Leave empty for unlimited</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Confirmation message</Label>
        <Textarea
          value={settings.confirmation_message || ''}
          onChange={e => update({ confirmation_message: e.target.value })}
          placeholder="Thank you for your submission!"
          rows={3}
        />
      </div>
    </div>
  );
}

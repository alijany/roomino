'use client';

import { Button, Input, ToggleSwitch } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconCurrentLocation, IconMapPin, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useDeleteWorkplace, useSaveWorkplace, useWorkplaces } from './attendance.api';
import { FormModal } from './attendance.component.layout';
import { Workplace } from './attendance.types';
import { errorMessage, fa, getPosition } from './attendance.util';

/** OpenStreetMap preview with a marker — no map library needed. */
function MapPreview({ lat, lng }: { lat: number; lng: number }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const d = 0.005;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <iframe
      title="موقعیت محل کار"
      src={src}
      className="h-48 w-full rounded-xl border border-slate-200"
      loading="lazy"
    />
  );
}

export function WorkplacesSettings() {
  const { data, error, isLoading, refresh } = useWorkplaces();
  const remove = useDeleteWorkplace();
  const [editing, setEditing] = useState<Workplace | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Workplace | null>(null);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const result = await remove.submit(deleting.id);
      toast.success(result?.deactivated ? 'محل کار غیرفعال شد و سوابق آن حفظ ماند' : 'محل کار حذف شد');
      refresh();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError, 'حذف انجام نشد'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setEditing('new')}>
          <IconPlus className="size-4" />
          محل کار جدید
        </Button>
      </div>
      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        isEmpty={(d) => !d?.items.length}
        emptyMessage="هنوز محل کاری تعریف نشده است. ورود و خروج در شعاع مجاز آن ثبت می‌شود."
        onRetry={refresh}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data?.items.map((w) => (
            <div key={w.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1 font-medium text-slate-800">
                    <IconMapPin className="size-4 text-slate-400" />
                    {w.name}
                  </div>
                  <div className="text-xs text-slate-500">{[w.city, w.address].filter(Boolean).join(' — ') || '—'}</div>
                </div>
                {!w.active && <Badge tone="muted">غیرفعال</Badge>}
              </div>
              <div className="text-xs text-slate-500">شعاع مجاز: {fa(w.radiusMeters)} متر</div>
              <div className="mt-auto flex justify-end gap-1 pt-2">
                <Button variant="outline" size="sm" className="!px-2" onClick={() => setEditing(w)} aria-label="ویرایش">
                  <IconPencil className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="!px-2 border-none text-rose-500"
                  onClick={() => setDeleting(w)}
                  aria-label={`حذف ${w.name}`}
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DataView>

      {editing && (
        <WorkplaceForm
          key={editing === 'new' ? 'new' : editing.id}
          workplace={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      <ConfirmModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="حذف محل کار"
        message={`«${deleting?.name ?? ''}» حذف شود؟ اگر پرسنل یا ترددی به آن متصل باشد فقط غیرفعال می‌شود.`}
        confirmButtonText="حذف"
        cancelButtonText="بازگشت"
      />
    </div>
  );
}

function WorkplaceForm({
  workplace,
  onClose,
  onSaved,
}: {
  workplace: Workplace | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useSaveWorkplace();
  const [name, setName] = useState(workplace?.name ?? '');
  const [city, setCity] = useState(workplace?.city ?? '');
  const [address, setAddress] = useState(workplace?.address ?? '');
  const [lat, setLat] = useState(workplace ? String(workplace.lat) : '');
  const [lng, setLng] = useState(workplace ? String(workplace.lng) : '');
  const [radius, setRadius] = useState(String(workplace?.radiusMeters ?? 100));
  const [active, setActive] = useState(workplace?.active ?? true);
  const [locating, setLocating] = useState(false);

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const ready = name.trim() && lat !== '' && lng !== '' && Number.isFinite(latNum) && Number.isFinite(lngNum);

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const position = await getPosition();
      setLat(position.lat.toFixed(6));
      setLng(position.lng.toFixed(6));
    } catch (locateError) {
      toast.warning((locateError as Error).message);
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    try {
      await save.submit({
        id: workplace?.id,
        data: {
          name: name.trim(),
          city: city.trim() || undefined,
          address: address.trim() || undefined,
          lat: latNum,
          lng: lngNum,
          radiusMeters: Number(radius) || 100,
          active,
        },
      });
      toast.success(workplace ? 'محل کار ویرایش شد' : 'محل کار اضافه شد');
      onSaved();
      onClose();
    } catch (saveError) {
      toast.error(errorMessage(saveError, 'ذخیره انجام نشد'));
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      title={workplace ? 'ویرایش محل کار' : 'محل کار جدید'}
      footer={
        <>
          <Button className="flex-1" disabled={!ready || save.isLoading} onClick={handleSave}>
            {save.isLoading ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      <Input label="نام" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="شهر (اختیاری)" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input label="شعاع مجاز (متر)" dir="ltr" className="text-left" value={radius} onChange={(e) => setRadius(e.target.value)} />
      </div>
      <Input label="نشانی (اختیاری)" value={address} onChange={(e) => setAddress(e.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="عرض جغرافیایی" dir="ltr" className="text-left" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="35.6997" />
        <Input label="طول جغرافیایی" dir="ltr" className="text-left" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="51.3380" />
      </div>
      <Button variant="outline" size="sm" className="gap-1" disabled={locating} onClick={useMyLocation}>
        <IconCurrentLocation className="size-4" />
        {locating ? 'در حال دریافت...' : 'استفاده از موقعیت فعلی من'}
      </Button>
      {ready && <MapPreview lat={latNum} lng={lngNum} />}
      <ToggleSwitch label="فعال" checked={active} onChange={setActive} />
    </FormModal>
  );
}

'use client';

import { Button, Dropdown, FilePicker } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { IconFile, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useDeleteAttachment,
  usePaymentRequest,
  useUploadAttachment,
} from './finance.api';
import { ATTACHMENT_KIND_LABELS } from './finance.constants';
import { AttachmentKind } from './finance.types';

interface AttachmentPanelProps {
  requestId: number;
  canEdit?: boolean;
}

/**
 * Documents attached to a request. Files are stored private and served through
 * short-lived signed URLs, so a link copied out of here stops working — that is
 * intended, not a bug to route around.
 */
export function AttachmentPanel({ requestId, canEdit }: AttachmentPanelProps) {
  const { data, error, isLoading, refresh } = usePaymentRequest(requestId);
  const upload = useUploadAttachment(requestId);
  const remove = useDeleteAttachment();
  const [kind, setKind] = useState<AttachmentKind>(AttachmentKind.INVOICE);

  const handleFiles = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    try {
      await upload.submit({ file, kind });
      toast.success('پیوست اضافه شد');
      refresh();
    } catch (uploadError) {
      toast.error((uploadError as Error)?.message ?? 'افزودن پیوست انجام نشد');
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await remove.submit(id);
      toast.success('پیوست حذف شد');
      refresh();
    } catch (removeError) {
      toast.error((removeError as Error)?.message ?? 'حذف پیوست انجام نشد');
    }
  };

  return (
    <div className="space-y-3">
      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        variant="inline"
        isEmpty={(d) => !d?.attachments?.length}
        emptyMessage="هنوز مدرکی اضافه نشده است"
        onRetry={refresh}
      >
        <ul className="flex flex-col gap-2">
          {data?.attachments?.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <IconFile className="size-5 shrink-0 text-slate-400" />
              <div className="grow min-w-0">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-medium text-slate-800 hover:text-primary"
                >
                  {attachment.filename}
                </a>
                <span className="text-xs text-slate-500">
                  {ATTACHMENT_KIND_LABELS[attachment.kind] ?? attachment.kind}
                  {' · '}
                  {Math.max(1, Math.round(attachment.sizeBytes / 1024)).toLocaleString('fa-IR')} کیلوبایت
                </span>
              </div>
              {canEdit && (
                <Button
                  variant="outline"
                  className="!px-2 border-none text-rose-500"
                  onClick={() => handleRemove(attachment.id)}
                  disabled={remove.isLoading}
                  aria-label={`حذف ${attachment.filename}`}
                >
                  <IconTrash className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </DataView>

      {canEdit && (
        <div className="space-y-2">
          <div className="w-full sm:w-56">
            <Dropdown
              items={Object.values(AttachmentKind).map((value) => ({
                label: ATTACHMENT_KIND_LABELS[value],
                value,
              }))}
              value={kind}
              onChange={(value) => setKind(value as AttachmentKind)}
              variant="outline"
              size="sm"
            />
          </div>

          <FilePicker
            accept="image/jpeg,image/png,image/webp,application/pdf"
            disabled={upload.isLoading}
            label={upload.isLoading ? 'در حال بارگذاری...' : 'انتخاب فایل'}
            description={
              <>
                فاکتور، پیش‌فاکتور یا رسید را اینجا رها کنید
                <br />
                <span className="text-xs">تصویر یا PDF، حداکثر ۱۰ مگابایت</span>
              </>
            }
            onFilesSelected={handleFiles}
            className="!p-5"
          />
        </div>
      )}
    </div>
  );
}

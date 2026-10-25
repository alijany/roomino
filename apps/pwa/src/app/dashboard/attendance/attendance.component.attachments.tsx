'use client';

import { Button, FilePicker } from '@/ui/atoms';
import { IconFile, IconTrash, IconUpload } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import {
  useDeleteRequestAttachment,
  useRequestAttachments,
  useUploadRequestAttachment,
} from './attendance.api';
import { ATTACHMENT_ACCEPT, ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_COUNT } from './attendance.constants';
import { errorMessage, fa } from './attendance.util';

const ACCEPTED = ATTACHMENT_ACCEPT.split(',');

const sizeLabel = (bytes: number) => `${fa(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`;

/** Drops files the server would refuse, saying why — keeps `room` slots at most. */
function acceptable(files: File[], room: number): File[] {
  const ok: File[] = [];
  for (const file of files) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error(`«${file.name}»: فقط تصویر (JPG، PNG، WebP) و PDF پذیرفته می‌شود`);
    } else if (file.size > ATTACHMENT_MAX_BYTES) {
      toast.error(`«${file.name}»: حجم فایل بیش از ۱۰ مگابایت است`);
    } else if (ok.length >= room) {
      toast.error(`حداکثر ${fa(ATTACHMENT_MAX_COUNT)} پیوست برای هر درخواست مجاز است`);
      break;
    } else {
      ok.push(file);
    }
  }
  return ok;
}

function FileRow({
  name,
  size,
  href,
  onRemove,
  disabled,
}: {
  name: string;
  size: number;
  href?: string | null;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <IconFile className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
      <div className="min-w-0 grow">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm font-medium text-slate-800 hover:text-primary"
          >
            {name}
          </a>
        ) : (
          <span className="block truncate text-sm font-medium text-slate-800">{name}</span>
        )}
        <span className="text-xs text-slate-500">{sizeLabel(size)}</span>
      </div>
      {onRemove && (
        <Button
          variant="outline"
          className="!px-2 border-none text-rose-500"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`حذف ${name}`}
        >
          <IconTrash className="size-4" />
        </Button>
      )}
    </li>
  );
}

/** Files chosen in the new-request form; they upload once the request exists. */
export function AttachmentPicker({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const full = files.length >= ATTACHMENT_MAX_COUNT;

  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file, index) => (
            <FileRow
              key={`${file.name}-${index}`}
              name={file.name}
              size={file.size}
              disabled={disabled}
              onRemove={() => onChange(files.filter((_, i) => i !== index))}
            />
          ))}
        </ul>
      )}
      {!full && (
        <FilePicker
          multiple
          accept={ATTACHMENT_ACCEPT}
          disabled={disabled}
          label="انتخاب فایل"
          description={
            <span className="text-xs">
              تصویر یا PDF، حداکثر ۱۰ مگابایت، تا {fa(ATTACHMENT_MAX_COUNT)} فایل
            </span>
          }
          onFilesSelected={(list) =>
            onChange([...files, ...acceptable(Array.from(list), ATTACHMENT_MAX_COUNT - files.length)])
          }
          icon={<IconUpload className="size-5 text-slate-500" aria-hidden="true" />}
          className="!p-3 [&>div:first-of-type]:!mb-2"
        />
      )}
    </div>
  );
}

/**
 * A request's saved attachments. Everyone who can see the request can open
 * them; `canEdit` (the owner, while pending) adds upload and delete.
 */
export function RequestAttachments({
  requestId,
  canEdit = false,
}: {
  requestId: number;
  canEdit?: boolean;
}) {
  const { data, isLoading, refresh } = useRequestAttachments(requestId);
  const upload = useUploadRequestAttachment();
  const remove = useDeleteRequestAttachment();
  const items = data?.items ?? [];
  const busy = upload.isLoading || remove.isLoading;

  const handleFiles = async (list: FileList) => {
    for (const file of acceptable(Array.from(list), ATTACHMENT_MAX_COUNT - items.length)) {
      try {
        await upload.submit({ requestId, file });
      } catch (error) {
        toast.error(errorMessage(error, `بارگذاری «${file.name}» انجام نشد`));
      }
    }
    refresh();
  };

  const handleRemove = async (id: number) => {
    try {
      await remove.submit({ requestId, id });
      refresh();
    } catch (error) {
      toast.error(errorMessage(error, 'حذف پیوست انجام نشد'));
    }
  };

  if (!canEdit && !isLoading && items.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="text-sm text-slate-500">پیوست‌ها</div>
      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <FileRow
              key={item.id}
              name={item.filename}
              size={item.sizeBytes}
              href={item.url}
              disabled={busy}
              onRemove={canEdit ? () => handleRemove(item.id) : undefined}
            />
          ))}
        </ul>
      )}
      {canEdit && items.length < ATTACHMENT_MAX_COUNT && (
        <FilePicker
          multiple
          accept={ATTACHMENT_ACCEPT}
          disabled={busy}
          label={upload.isLoading ? 'در حال بارگذاری...' : 'افزودن پیوست'}
          description={<span className="text-xs">تصویر یا PDF، حداکثر ۱۰ مگابایت</span>}
          onFilesSelected={handleFiles}
          icon={<IconUpload className="size-5 text-slate-500" aria-hidden="true" />}
          className="!p-3 [&>div:first-of-type]:!mb-2"
        />
      )}
    </div>
  );
}

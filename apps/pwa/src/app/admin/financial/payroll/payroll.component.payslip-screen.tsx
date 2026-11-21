'use client';

import { Button } from '@/ui/atoms';
import { BackButton, DataView } from '@/ui/molecules';
import { IconDownload, IconPrinter, IconShare } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { PayslipView } from './payroll.component.payslip';
import { Payslip } from './payroll.types';
import { payslipPdf } from './payroll.util.payslip-pdf';

/** A payslip on its own page with share, download and print; the payroll team's and the employee's pages both use it. */
export function PayslipScreen({
  data,
  error,
  isLoading,
  refresh,
  backHref,
  backLabel,
}: {
  data: Payslip | undefined;
  error: unknown;
  isLoading: boolean;
  refresh: () => void;
  backHref: string;
  backLabel: string;
}) {

  const slipRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'share' | 'download' | null>(null);

  /** Runs `then` with the slip as a PDF file; the share sheet being closed is not a failure. */
  const withPdf = async (kind: 'share' | 'download', then: (file: File) => Promise<void> | void) => {
    if (!data || !slipRef.current) return;
    setBusy(kind);
    try {
      const blob = await payslipPdf(slipRef.current);
      const name = `payslip-${data.user.personnelCode ?? data.user.id}-${data.period}.pdf`;
      await then(new File([blob], name, { type: 'application/pdf' }));
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') toast.error('ساخت یا ارسال PDF انجام نشد');
    } finally {
      setBusy(null);
    }
  };

  const download = (file: File) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('فایل PDF فیش ذخیره شد');
  };

  /** Sends the slip on as a PDF file; where the device cannot share files, it is saved instead. */
  const share = () =>
    withPdf('share', async (file) => {
      // Only the file: with a title, some apps take the title as the whole message and drop the file.
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else download(file);
    });

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-6 print:bg-white print:p-0">
      <style>{`@media print { @page { size: A4; margin: 8mm; } html, body { background: #fff !important; } .payslip { break-inside: avoid; page-break-inside: avoid; zoom: 0.92; } }`}</style>

      <div className="mx-auto mb-4 flex w-full max-w-[820px] items-center justify-between gap-2 print:hidden">
        <BackButton href={backHref} label={backLabel} />
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1 bg-white" disabled={!data || busy !== null} onClick={share}>
            <IconShare className="size-4" />
            {busy === 'share' ? 'در حال ساخت PDF...' : 'اشتراک‌گذاری PDF'}
          </Button>
          <Button variant="outline" className="gap-1 bg-white" disabled={!data || busy !== null} onClick={() => withPdf('download', download)}>
            <IconDownload className="size-4" />
            {busy === 'download' ? 'در حال ساخت PDF...' : 'دانلود PDF'}
          </Button>
          <Button className="gap-1" disabled={!data} onClick={() => window.print()}>
            <IconPrinter className="size-4" />
            چاپ / ذخیره‌ی PDF
          </Button>
        </div>
      </div>

      <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
        {data && (
          <div ref={slipRef}>
            <PayslipView slip={data} />
          </div>
        )}
      </DataView>
    </div>
  );
}

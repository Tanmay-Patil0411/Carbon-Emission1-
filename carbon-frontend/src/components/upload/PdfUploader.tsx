import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import type { ActivityAttachment } from "../../types/emissions";
import { formatBytes } from "../../utils/emissionsCalculator";
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

interface PdfUploaderProps {
  attachments: ActivityAttachment[];
  onAttachmentsChange: (newAttachments: ActivityAttachment[]) => void;
  maxSizeBytes?: number; // Default 10MB
}

export default function PdfUploader({
  attachments,
  onAttachmentsChange,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB limit
}: PdfUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: FileList | File[]) => {
    setErrorMsg(null);
    const validFiles: ActivityAttachment[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      // 1. Validate MIME type or file extension
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        errors.push(`"${file.name}" is not a PDF document. Only PDF files are supported.`);
        return;
      }

      // 2. Validate file size (10MB default)
      if (file.size > maxSizeBytes) {
        errors.push(
          `"${file.name}" exceeds the maximum size limit of ${formatBytes(maxSizeBytes)}.`
        );
        return;
      }

      // Create downloadable local URL & attachment record
      const objectUrl = URL.createObjectURL(file);
      const newAttachment: ActivityAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        fileName: file.name,
        fileUrl: objectUrl,
        uploadedAt: new Date().toISOString(),
        sizeBytes: file.size,
      };

      validFiles.push(newAttachment);
    });

    if (errors.length > 0) {
      setErrorMsg(errors.join(" "));
    }

    if (validFiles.length > 0) {
      onAttachmentsChange([...attachments, ...validFiles]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // reset input so user can choose same file if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter((att) => att.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-slate-900">
          Supporting Document <span className="font-normal text-slate-500">(Optional)</span>
        </label>
        <span className="text-xs text-slate-400 font-medium">PDF format only • Max 10MB</span>
      </div>

      {/* Helper disclaimer text required by prompt */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-800 text-xs leading-relaxed">
        <InformationCircleIcon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p>
          <strong className="font-semibold">Evidence attachment mode:</strong> We'll extract data from uploaded PDFs automatically in a future update — for now, please also enter the numeric value manually above.
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? "border-emerald-500 bg-emerald-50/50 scale-[0.99]"
            : "border-slate-300 hover:border-emerald-500 hover:bg-slate-50/60 bg-white"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100/80 flex items-center justify-center text-emerald-600">
            <CloudArrowUpIcon className="w-6 h-6" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              <span className="text-emerald-600 font-bold underline underline-offset-2">Click to upload</span> or drag and drop PDF evidence files
            </p>
            <p className="text-xs text-slate-400 mt-1">
              AWS/Azure cloud invoices, laptop POs, flight receipts, e-waste certificates, tech park power bills
            </p>
          </div>
        </div>
      </div>

      {/* Inline Validation Error */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Attached Files List */}
      {attachments.length > 0 && (
        <div className="space-y-2 pt-1">
          <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Attached Evidence Files ({attachments.length})
          </h5>

          <div className="space-y-2">
            {attachments.map((att) => {
              const formattedDate = new Date(att.uploadedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <DocumentTextIcon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {att.fileName}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{formatBytes(att.sizeBytes)}</span>
                        <span>•</span>
                        <span>Attached {formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* View / Download PDF */}
                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                      title="Download / View PDF"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </a>

                    {/* Delete Attachment */}
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Remove file"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

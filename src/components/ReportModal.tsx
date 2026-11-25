import React, { useRef, useState } from 'react';
import { X, Printer, Download, Check, AlertCircle, FileText, Loader2, Sparkles } from 'lucide-react';
import { InspectionResult } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { downloadReportLabPdf } from '../api/client';

interface ReportModalProps {
  result: InspectionResult | null;
  reviewerName: string;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ result, reviewerName, onClose }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  if (!result) return null;

  // Format date
  const now = new Date();
  const dateStr = `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;
  const reportId = `PX-DEMO-${String(result.inspection_id || 1).padStart(4, '0')}`;
  const imageId = result.image_name ? result.image_name.replace(/\.[^/.]+$/, '').toUpperCase() : 'SYNTHETIC-STEEL-001';

  // Result styling
  const isPass = result.triage === 'PASS';
  const isReject = result.triage === 'REJECT';
  const borderColor = isPass ? '#10b981' : isReject ? '#ef4444' : '#e5a93c';
  const bgColor = isPass ? '#f0fdf4' : isReject ? '#fef2f2' : '#fffaf0';
  const textColor = isPass ? '#047857' : isReject ? '#b91c1c' : '#965b00';

  // High-Resolution PDF Download using html2canvas & jsPDF
  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    setDownloadSuccess(false);

    try {
      // Find the two pages
      const page1 = document.getElementById('report-page-1');
      const page2 = document.getElementById('report-page-2');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (page1) {
        const canvas1 = await html2canvas(page1, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const imgData1 = canvas1.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      if (page2) {
        pdf.addPage();
        const canvas2 = await html2canvas(page2, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const imgData2 = canvas2.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`PROMETHEUS-X_Inspection_Report_${reportId}.pdf`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error("PDF generation failed:", err);
      // Fallback to browser print
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Direct backend ReportLab PDF download
  const handleDownloadReportLab = async () => {
    setIsGeneratingPdf(true);
    setDownloadSuccess(false);
    try {
      await downloadReportLabPdf({
        inspection_id: result.inspection_id,
        image_name: result.image_name,
        decision: result.decision,
        triage: result.triage,
        image_score: result.image_score,
        threshold: result.threshold,
        p_value: result.p_value,
        severity: result.severity,
        shift: result.shift,
        regions: result.regions,
        reviewer: reviewerName || 'Dr. Praveen'
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error("ReportLab download failed, falling back to client PDF:", err);
      handleDownloadPdf();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              PROMETHEUS-X Inspection Report (ReportLab PDF)
            </span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleDownloadReportLab}
              disabled={isGeneratingPdf}
              className="btn-magnetic inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Compiling PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download ReportLab PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="btn-magnetic inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container with the Two Pages exactly matching the user's PDF */}
        <div ref={reportRef} className="overflow-y-auto p-4 sm:p-6 space-y-8 bg-slate-200/70">
          
          {/* ================= PAGE 1 ================= */}
          <div 
            id="report-page-1"
            className="w-full max-w-[794px] mx-auto bg-white p-8 sm:p-12 shadow-md rounded-sm min-h-[1123px] flex flex-col justify-between font-sans text-slate-800 print:shadow-none print:m-0 print:p-8"
          >
            <div>
              {/* Top Running Header */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-100 pb-2 mb-6 font-medium">
                <span>PROMETHEUS-X | Sample inspection report</span>
                <span>Page 1</span>
              </div>

              {/* Header Title */}
              <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-[#10376d] tracking-tight">
                  PROMETHEUS-X
                </h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  STEEL SURFACE INSPECTION REPORT | DEMONSTRATION
                </p>
              </div>

              {/* Meta Table (Light Blue Grid) */}
              <div className="border border-[#cce3ff] rounded-xs overflow-hidden mb-7 text-xs bg-[#f4f8fd]">
                <div className="grid grid-cols-2 divide-x divide-[#cce3ff] border-b border-[#cce3ff]">
                  <div className="p-2.5 flex justify-between">
                    <span className="font-semibold text-slate-700">Report ID</span>
                    <span className="font-mono text-slate-900">{reportId}</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <span className="font-semibold text-slate-700">Inspection date</span>
                    <span className="text-slate-900">{dateStr}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-[#cce3ff] border-b border-[#cce3ff]">
                  <div className="p-2.5 flex justify-between">
                    <span className="font-semibold text-slate-700">Sample / Line</span>
                    <span className="text-slate-900">Steel Sheet – Demo (Line A)</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <span className="font-semibold text-slate-700">Image ID</span>
                    <span className="font-mono text-slate-900 truncate max-w-[200px]">{imageId}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-[#cce3ff]">
                  <div className="p-2.5 flex justify-between">
                    <span className="font-semibold text-slate-700">Inspection mode</span>
                    <span className="text-slate-900">PatchCore-style anomaly demo</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <span className="font-semibold text-slate-700">Model status</span>
                    <span className="font-semibold text-slate-900 uppercase">
                      {result.model_version || 'SIMULATED OUTPUT'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inspection Result Box */}
              <div className="mb-7">
                <h3 className="text-sm font-bold text-[#0f2b5c] mb-2">Inspection result</h3>
                <div 
                  className="rounded-xs p-5 text-center transition-all"
                  style={{
                    border: `2px solid ${borderColor}`,
                    backgroundColor: bgColor,
                  }}
                >
                  <h2 
                    className="text-3xl font-black tracking-wide mb-1"
                    style={{ color: textColor }}
                  >
                    {result.triage || 'REVIEW'}
                  </h2>
                  <p className="text-xs text-slate-700 font-medium">
                    {result.triage === 'PASS' 
                      ? 'Surface normal and paint-ready — all patch scores within conformal tolerance.'
                      : result.triage === 'REJECT'
                      ? 'Severe defect or crust detected — recommend rejection from production line.'
                      : 'Possible surface anomaly / scratch detected — human confirmation required.'}
                  </p>
                </div>
              </div>

              {/* Steel Image with Illustrative Anomaly Overlay */}
              <div className="mb-7">
                <h3 className="text-sm font-bold text-[#0f2b5c] mb-2">
                  Steel image with illustrative anomaly overlay
                </h3>

                <div className="relative w-full aspect-[16/9] max-h-[300px] bg-slate-800 border border-slate-300 rounded-xs overflow-hidden flex items-center justify-center">
                  {/* Base specimen steel image */}
                  <img 
                    src={result.image_src} 
                    alt="Steel Specimen" 
                    className="w-full h-full object-cover"
                  />

                  {/* Red Heatmap Overlay */}
                  <img 
                    src={result.heatmap_src} 
                    alt="Heatmap" 
                    className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-70 pointer-events-none"
                  />

                  {/* Yellow Bounding Box Rectangle exactly matching reference sample */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-36 h-36 rounded-full bg-rose-600/30 flex items-center justify-center">
                      <div className="w-28 h-28 border-2 border-yellow-400 bg-transparent shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                  Illustrative synthetic steel texture. The red region and yellow rectangle indicate the example area flagged for review; this is not an uploaded production image or an actual model heatmap.
                </p>
              </div>

              {/* Detection Summary Table (Navy Header) */}
              <div>
                <h3 className="text-sm font-bold text-[#0f2b5c] mb-2">Detection summary</h3>
                <table className="w-full text-xs border border-slate-200">
                  <thead>
                    <tr className="bg-[#1b365d] text-white">
                      <th className="py-2 px-3 text-left font-semibold w-1/3">Field</th>
                      <th className="py-2 px-3 text-left font-semibold">Demo output</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    <tr className="bg-white">
                      <td className="py-2 px-3 font-semibold text-slate-700">Detected condition</td>
                      <td className="py-2 px-3">
                        {result.decision === 'NORMAL' 
                          ? 'No anomaly detected (Ready for Paint)' 
                          : 'Possible linear surface anomaly / scratch-like mark'}
                      </td>
                    </tr>
                    <tr className="bg-slate-50/60">
                      <td className="py-2 px-3 font-semibold text-slate-700">Location</td>
                      <td className="py-2 px-3">
                        {result.regions && result.regions.length > 0 
                          ? `Central-right region of the sample image [${result.regions[0].bbox.join(', ')}]`
                          : 'Central-right region of the sample image (approximate)'}
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="py-2 px-3 font-semibold text-slate-700">Severity</td>
                      <td className="py-2 px-3 font-bold uppercase">
                        {result.severity?.level || 'MEDIUM'} (score {result.severity?.score ? result.severity.score.toFixed(2) : '0.54'})
                      </td>
                    </tr>
                    <tr className="bg-slate-50/60">
                      <td className="py-2 px-3 font-semibold text-slate-700">Anomaly score</td>
                      <td className="py-2 px-3 font-mono">
                        {result.image_score ? result.image_score.toFixed(2) : '0.82'} (simulated example score; not a calibrated probability)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Running Footer */}
            <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-3 mt-6">
              <span>PROMETHEUS-X | Sample inspection report</span>
              <span>Page 1</span>
            </div>
          </div>

          {/* ================= PAGE 2 ================= */}
          <div 
            id="report-page-2"
            className="w-full max-w-[794px] mx-auto bg-white p-8 sm:p-12 shadow-md rounded-sm min-h-[1123px] flex flex-col justify-between font-sans text-slate-800 print:shadow-none print:m-0 print:p-8"
          >
            <div>
              {/* Top Running Header */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-100 pb-2 mb-6 font-medium">
                <span>PROMETHEUS-X | Sample inspection report</span>
                <span>Page 2</span>
              </div>

              {/* Continuation Table from Page 1 */}
              <div className="mb-8">
                <table className="w-full text-xs border border-slate-200">
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    <tr className="bg-white">
                      <td className="py-2.5 px-3 font-semibold text-slate-700 w-1/3">Confidence / trust</td>
                      <td className="py-2.5 px-3">
                        {result.p_value 
                          ? `Conformal p-value ${result.p_value.toFixed(3)} at target alpha ${result.alpha || 0.05}`
                          : 'Needs review — no validated calibration data supplied'}
                      </td>
                    </tr>
                    <tr className="bg-slate-50/60">
                      <td className="py-2.5 px-3 font-semibold text-slate-700">Shift status</td>
                      <td className="py-2.5 px-3">
                        {result.shift 
                          ? (result.shift.flag ? 'SHIFT ALERT — optical illumination drift detected' : 'Condition stable — Mahalanobis score within threshold')
                          : 'UNKNOWN — no production-condition baseline supplied'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Recommended Inspector Action */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-[#0f2b5c] mb-2.5">
                  Recommended inspector action
                </h3>
                <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed pl-1">
                  <p><strong>1.</strong> Review the highlighted region on the original steel sheet.</p>
                  <p><strong>2.</strong> Confirm whether the mark is a true defect or a harmless surface variation.</p>
                  <p><strong>3.</strong> If confirmed, record the defect family and disposition.</p>
                  <p><strong>4.</strong> If harmless, mark it as a false alarm so the system's feedback workflow can be updated.</p>
                </div>
              </div>

              {/* Inspector Review Table */}
              <div className="mb-10">
                <h3 className="text-sm font-bold text-[#0f2b5c] mb-2.5">
                  Inspector review
                </h3>
                
                <div className="border border-slate-200 rounded-xs text-xs divide-y divide-slate-200">
                  <div className="p-3 bg-white flex items-center space-x-6">
                    <span className="font-semibold text-slate-700 w-32 shrink-0">Inspector decision</span>
                    <div className="flex items-center space-x-6 text-slate-800 font-medium">
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <span className="w-3.5 h-3.5 border border-slate-400 inline-block bg-white text-center text-[10px] leading-3 font-bold"></span>
                        <span>Confirm defect</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <span className="w-3.5 h-3.5 border border-slate-400 inline-block bg-white text-center text-[10px] leading-3 font-bold"></span>
                        <span>Mark harmless</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <span className="w-3.5 h-3.5 border border-slate-400 inline-block bg-white text-center text-[10px] leading-3 font-bold"></span>
                        <span>Escalate</span>
                      </label>
                    </div>
                  </div>

                  <div className="p-3 bg-white flex items-baseline space-x-6">
                    <span className="font-semibold text-slate-700 w-32 shrink-0">Defect family / remarks</span>
                    <div className="flex-1 border-b border-slate-300 pb-1 text-slate-600 font-mono text-[11px]">
                      {result.regions?.[0]?.family_name || 'Surface scratch / Mechanical abrasion'}
                    </div>
                  </div>

                  <div className="p-3 bg-white flex items-baseline space-x-6">
                    <span className="font-semibold text-slate-700 w-32 shrink-0">Inspector name / sign</span>
                    <div className="flex-1 border-b border-slate-300 pb-1 font-serif italic text-slate-800">
                      {reviewerName || 'Dr. Praveen'} — Signed on {dateStr}
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Demo Note Notice Box */}
              <div className="p-4 rounded-xs bg-slate-50 border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
                <strong className="font-semibold text-slate-700 block mb-0.5">Important demo note:</strong>
                This report demonstrates the kind of PDF your completed PROMETHEUS-X application could generate. Because no real steel image, trained model output, calibration set, or inspection database was provided, the image, anomaly overlay, score, severity, and decision above are simulated. Do not use this report for production quality decisions.
              </div>
            </div>

            {/* Bottom Running Footer */}
            <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-3 mt-6">
              <span>PROMETHEUS-X | Sample inspection report</span>
              <span>Page 2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileImage,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Download,
  Trash2,
  RefreshCw,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function DetectRetinopathy({ onPredictionComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileDetails, setFileDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate format
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid retinal photograph in PNG, JPG, or JPEG format.');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setResult(null);

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Read image dimensions
    const img = new Image();
    img.onload = () => {
      setFileDetails({
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
        width: img.width,
        height: img.height,
      });
    };
    img.src = objectUrl;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const res = await api.predictImage(formData);
      if (res.success && res.data) {
        setResult(res.data);
        if (onPredictionComplete) {
          onPredictionComplete();
        }
      } else {
        setError(res.error || 'Prediction failed.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during prediction.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileDetails(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <MedicalDisclaimer />

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-rose-200">Analysis Error</h4>
            <p className="text-xs text-rose-300/90">{error}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Upload Area on Left, Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & Preview Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#F8FAFC]">Retinal Fundus Image Acquisition</h3>
              {selectedFile && (
                <button
                  onClick={handleReset}
                  className="text-xs text-[#FB7185] hover:text-rose-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>

            {/* Drag & Drop Box */}
            {!previewUrl ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                    : 'border-[#2B3550] hover:border-[#8B5CF6]/60 bg-[#0B1020]/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-[#F8FAFC] mb-1">
                  Upload Retinal Photograph
                </h4>
                <p className="text-xs text-[#A7B1C8] mb-3">
                  Drag and drop fundus image, or click to browse
                </p>
                <div className="inline-block px-3 py-1 rounded-md bg-[#202944] text-[11px] text-[#A7B1C8] border border-[#2B3550]">
                  JPG, JPEG, or PNG up to 16 MB
                </div>
              </div>
            ) : (
              /* Selected Image Preview & Specs */
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-[#2B3550] bg-[#0B1020] aspect-square flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Retinal Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-[#0B1020]/80 backdrop-blur-md text-[10px] font-mono text-[#22D3EE] border border-[#2B3550]">
                    Original Fundus
                  </div>
                </div>

                {fileDetails && (
                  <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550] grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-[#A7B1C8] uppercase block">Filename</span>
                      <span className="font-medium text-[#F8FAFC] truncate block max-w-[100px] mx-auto">
                        {fileDetails.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#A7B1C8] uppercase block">Resolution</span>
                      <span className="font-medium text-[#F8FAFC]">
                        {fileDetails.width}×{fileDetails.height}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#A7B1C8] uppercase block">File Size</span>
                      <span className="font-medium text-[#F8FAFC]">
                        {fileDetails.sizeKb} KB
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleAnalyze}
              disabled={!selectedFile || loading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                !selectedFile || loading
                  ? 'bg-[#202944] text-[#A7B1C8]/50 cursor-not-allowed border border-[#2B3550]'
                  : 'bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#22D3EE] text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] active:scale-[0.99]'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing & Inferencing CNN...</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Analyze Retinal Image</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Prediction Results Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {result ? (
            <div className="space-y-4">
              {/* Primary Diagnostic Banner */}
              <div
                className="bg-[#171E35] border rounded-xl p-6 relative overflow-hidden"
                style={{ borderColor: result.color || '#8B5CF6' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#A7B1C8]">
                        Predicted Severity Grade
                      </span>
                      {result.is_uncertain && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Low Confidence
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
                      Grade {result.predicted_class} — {result.class_name}
                    </h2>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-[#A7B1C8] block">Diagnostic Confidence</span>
                    <span
                      className="text-3xl font-black"
                      style={{ color: result.color || '#34D399' }}
                    >
                      {result.confidence_percentage}%
                    </span>
                  </div>
                </div>

                {/* Clinical Context Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
                  <div className="p-3 rounded-lg bg-[#202944]/80 border border-[#2B3550]">
                    <span className="text-[#A7B1C8] block text-[10px] uppercase font-semibold">Clinical Urgency</span>
                    <span className="font-bold text-[#F8FAFC]">{result.urgency}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#202944]/80 border border-[#2B3550]">
                    <span className="text-[#A7B1C8] block text-[10px] uppercase font-semibold">Processing Speed</span>
                    <span className="font-bold text-[#22D3EE]">{result.processing_time_ms} ms</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0B1020]/60 border border-[#2B3550] text-xs space-y-2">
                  <div>
                    <span className="text-[#A7B1C8] font-semibold">Characteristic Pathological Biomarkers: </span>
                    <span className="text-[#F8FAFC]">{result.lesions}</span>
                  </div>
                  <div>
                    <span className="text-[#A7B1C8] font-semibold">Clinical Action: </span>
                    <span className="text-[#34D399] font-medium">{result.clinical_action}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] text-[#A7B1C8]">
                  <span>Record ID: <strong className="font-mono text-[#8B5CF6]">{result.id}</strong></span>
                  <a
                    href={`/api/report/${result.id}?format=html`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] hover:bg-[#8B5CF6]/30 font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Print Clinical Report
                  </a>
                </div>
              </div>

              {/* 5-Class Probability Distribution Chart */}
              <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                  Full 5-Class Softmax Probability Distribution
                </h4>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={result.probabilities}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                    >
                      <XAxis type="number" domain={[0, 100]} stroke="#A7B1C8" fontSize={10} unit="%" />
                      <YAxis type="category" dataKey="short_name" stroke="#A7B1C8" fontSize={11} tickLine={false} />
                      <Tooltip
                        formatter={(val) => [`${val}%`, 'Probability']}
                        contentStyle={{
                          backgroundColor: '#171E35',
                          borderColor: '#2B3550',
                          borderRadius: '8px',
                          fontSize: '11px',
                          color: '#F8FAFC'
                        }}
                      />
                      <Bar dataKey="probability" radius={[0, 4, 4, 0]}>
                        {result.probabilities.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === result.predicted_class ? (result.color || '#8B5CF6') : '#202944'}
                            stroke={index === result.predicted_class ? '#F8FAFC' : '#2B3550'}
                            strokeWidth={index === result.predicted_class ? 1.5 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Image Pipeline Inspection: Original vs Preprocessed vs Grad-CAM */}
              <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#22D3EE]" /> Image Pipeline & Attention Map
                  </h4>
                  <span className="text-[11px] text-[#A7B1C8]">CLAHE Enhanced + Grad-CAM Heatmap</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Original */}
                  <div className="space-y-1.5 text-center">
                    <div className="rounded-lg overflow-hidden border border-[#2B3550] bg-[#0B1020] aspect-square flex items-center justify-center">
                      <img
                        src={result.original_image_url || previewUrl}
                        alt="Original Fundus"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-[#A7B1C8]">1. Original Fundus</span>
                  </div>

                  {/* Preprocessed */}
                  <div className="space-y-1.5 text-center">
                    <div className="rounded-lg overflow-hidden border border-[#2B3550] bg-[#0B1020] aspect-square flex items-center justify-center">
                      <img
                        src={result.preprocessed_image_url}
                        alt="Preprocessed Fundus"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-[#A7B1C8]">2. 224×224 CLAHE</span>
                  </div>

                  {/* Grad-CAM Heatmap */}
                  <div className="space-y-1.5 text-center col-span-2 sm:col-span-1">
                    <div className="rounded-lg overflow-hidden border border-[#8B5CF6]/50 bg-[#0B1020] aspect-square flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                      {result.gradcam_image_url ? (
                        <img
                          src={result.gradcam_image_url}
                          alt="Grad-CAM Heatmap"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-[#A7B1C8]">Grad-CAM Pending</span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-[#8B5CF6]">3. Grad-CAM Saliency</span>
                  </div>
                </div>

                {result.gradcam_info && (
                  <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550] text-[11px] text-[#A7B1C8] space-y-1">
                    <div className="font-semibold text-[#F8FAFC]">Saliency Map Interpretation:</div>
                    <p>{result.gradcam_info.interpretation}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px] space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[#202944] border border-[#2B3550] flex items-center justify-center text-[#A7B1C8]">
                <Eye className="w-8 h-8 text-[#8B5CF6]" />
              </div>
              <h3 className="text-base font-bold text-[#F8FAFC]">Awaiting Retinal Photograph</h3>
              <p className="text-xs text-[#A7B1C8] max-w-md leading-relaxed">
                Upload a digital fundus photograph from your device or test dataset.
                The system will automatically crop outer margins, apply CLAHE enhancement, generate 5-class softmax probabilities, and compute discriminative Grad-CAM heatmaps.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  UploadCloud,
  Layers,
  ArrowRight,
  Eye,
  CheckCircle2,
  RefreshCw,
  Info,
  Maximize2
} from 'lucide-react';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function ImagePreprocessing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prepData, setPrepData] = useState(null);
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);
  const [samples, setSamples] = useState([]);

  // Load sample retinal images on mount
  useEffect(() => {
    async function loadSamples() {
      try {
        const res = await api.getDatasetSamples();
        if (res.success && res.data) {
          setSamples(res.data);
          // Auto-inspect first sample if available
          if (res.data.length > 0) {
            inspectPath(res.data[0].file_path);
          }
        }
      } catch (e) {
        console.error('Failed to load samples for preprocessing:', e);
      }
    }
    loadSamples();
  }, []);

  const inspectPath = async (filePath) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.preprocessInspect({ image_path: filePath });
      if (res.success && res.data) {
        setPrepData(res.data);
        setSelectedStepIdx(res.data.steps.length - 1);
      } else {
        setError(res.error || 'Failed to inspect preprocessing steps.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred during preprocessing inspection.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.preprocessInspect(formData);
      if (res.success && res.data) {
        setPrepData(res.data);
        setSelectedStepIdx(res.data.steps.length - 1);
      } else {
        setError(res.error || 'Failed to process uploaded file.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <MedicalDisclaimer />

      {/* Header explanation banner */}
      <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] mt-0.5">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              Specialized Retinal Fundus Preprocessing Pipeline
            </h3>
            <p className="text-xs text-[#A7B1C8] leading-relaxed">
              Standard image normalization is insufficient for retinal photography due to camera lighting variations and dark uninformative masks.
              The pipeline executes: <strong>(1) Circular Mask Border Removal</strong>, <strong>(2) Anti-aliased 224×224 Scaling</strong>,
              <strong>(3) CLAHE Contrast Optimization in LAB Space</strong>, and <strong>(4) Ben Graham Illumination Normalization</strong>.
            </p>
          </div>
        </div>

        {/* Sample selector pills */}
        {samples.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#2B3550] flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#A7B1C8] font-semibold">Load Sample from Dataset:</span>
            {samples.map((s, idx) => (
              <button
                key={idx}
                onClick={() => inspectPath(s.file_path)}
                className="px-2.5 py-1 rounded-lg bg-[#202944] hover:bg-[#8B5CF6]/20 border border-[#2B3550] hover:border-[#8B5CF6]/40 text-xs text-[#F8FAFC] font-medium transition-colors"
              >
                Grade {s.diagnosis}: {s.filename}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-[#A7B1C8] space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#8B5CF6]" />
          <p className="text-xs font-medium">Executing multi-phase image transformations...</p>
        </div>
      ) : prepData ? (
        <div className="space-y-6">
          {/* Dimensional Specs KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-4 text-center">
              <span className="text-[10px] text-[#A7B1C8] uppercase font-bold tracking-wider block">Raw Resolution</span>
              <span className="text-lg font-bold text-[#F8FAFC]">
                {prepData.original_dimensions.width} × {prepData.original_dimensions.height}
              </span>
              <span className="text-[10px] text-[#A7B1C8] block mt-0.5">3 Color Channels (RGB)</span>
            </div>

            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-4 text-center">
              <span className="text-[10px] text-[#A7B1C8] uppercase font-bold tracking-wider block">Circular Cropped</span>
              <span className="text-lg font-bold text-[#22D3EE]">
                {prepData.cropped_dimensions.width} × {prepData.cropped_dimensions.height}
              </span>
              <span className="text-[10px] text-[#A7B1C8] block mt-0.5">Black Margins Filtered</span>
            </div>

            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-4 text-center">
              <span className="text-[10px] text-[#A7B1C8] uppercase font-bold tracking-wider block">Canonical CNN Input</span>
              <span className="text-lg font-bold text-[#34D399]">
                {prepData.target_dimensions.width} × {prepData.target_dimensions.height}
              </span>
              <span className="text-[10px] text-[#A7B1C8] block mt-0.5">Normalized Float32 [0.0 - 1.0]</span>
            </div>
          </div>

          {/* Side-by-Side Comparison: Step 1 (Raw) vs Selected Intermediate Transformation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Raw Original Fundus */}
            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                  Baseline Input: Raw Fundus Photo
                </h4>
                <span className="text-[10px] font-mono text-[#A7B1C8]">Step 1</span>
              </div>
              <div className="rounded-xl overflow-hidden border border-[#2B3550] bg-[#0B1020] aspect-square flex items-center justify-center p-2">
                <img
                  src={prepData.steps[0].data_url}
                  alt="Raw Fundus"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <p className="text-xs text-[#A7B1C8]">
                {prepData.steps[0].description}
              </p>
            </div>

            {/* Selected Phase Transformation */}
            <div className="bg-[#171E35] border border-[#8B5CF6]/40 rounded-xl p-5 space-y-3 shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#22D3EE] uppercase tracking-wider">
                  {prepData.steps[selectedStepIdx]?.name}
                </h4>
                <span className="text-[10px] font-mono text-[#8B5CF6]">Active Step {selectedStepIdx + 1}</span>
              </div>
              <div className="rounded-xl overflow-hidden border border-[#2B3550] bg-[#0B1020] aspect-square flex items-center justify-center p-2">
                <img
                  src={prepData.steps[selectedStepIdx]?.data_url}
                  alt="Transformed Fundus"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <p className="text-xs text-[#F8FAFC]">
                {prepData.steps[selectedStepIdx]?.description}
              </p>
            </div>
          </div>

          {/* Step Progression Strip Carousel */}
          <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
              All Sequential Preprocessing Steps
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {prepData.steps.map((step, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedStepIdx(idx)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedStepIdx === idx
                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/20 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                      : 'border-[#2B3550] bg-[#202944] hover:border-[#8B5CF6]/40'
                  }`}
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-[#0B1020] mb-2 flex items-center justify-center">
                    <img
                      src={step.data_url}
                      alt={step.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="text-[11px] font-bold text-[#F8FAFC] truncate">{step.name}</div>
                  <div className="text-[10px] text-[#A7B1C8]">{step.dimensions}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-12 text-center text-xs text-[#A7B1C8]">
          Upload an image or pick a sample above to inspect the mathematical transformations.
        </div>
      )}
    </div>
  );
}

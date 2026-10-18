import React, { useState, useEffect } from 'react';
import {
  Brain,
  Layers,
  Cpu,
  Eye,
  Activity,
  Sparkles,
  Info,
  RefreshCw,
  Sliders,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function FeatureAnalysis() {
  const [arch, setArch] = useState(null);
  const [loadingArch, setLoadingArch] = useState(true);
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);
  const [gradcamResult, setGradcamResult] = useState(null);
  const [loadingGradcam, setLoadingGradcam] = useState(false);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');

  useEffect(() => {
    async function init() {
      try {
        const [archRes, sampleRes] = await Promise.all([
          api.getArchitecture().catch(() => null),
          api.getDatasetSamples().catch(() => null),
        ]);

        if (archRes?.success && archRes?.data) {
          setArch(archRes.data);
        }
        if (sampleRes?.success && sampleRes?.data) {
          setSamples(sampleRes.data);
          if (sampleRes.data.length > 0) {
            handleRunGradcam(sampleRes.data[0]);
          }
        }
      } catch (e) {
        console.error('Feature analysis init error:', e);
      } finally {
        setLoadingArch(false);
      }
    }
    init();
  }, []);

  const handleRunGradcam = async (sample) => {
    setSelectedSample(sample);
    setLoadingGradcam(true);
    setError(null);
    try {
      const res = await api.getGradcam({
        image_path: sample.file_path,
        class_id: sample.diagnosis,
      });
      if (res.success && res.data) {
        setGradcamResult(res.data);
      } else {
        setError(res.error || 'Failed to generate Grad-CAM.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingGradcam(false);
    }
  };

  const layersList = arch?.layers || [];
  const filteredLayers =
    filterCategory === 'All'
      ? layersList
      : layersList.filter((l) => l.category.includes(filterCategory));

  return (
    <div className="space-y-6">
      <MedicalDisclaimer />

      {/* Header Info */}
      <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6]">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              Deep Convolutional Feature Hierarchy & Attention Saliency
            </h3>
            <p className="text-xs text-[#A7B1C8] leading-relaxed">
              Convolutional Neural Networks extract features hierarchically. Early layers detect basic edges and vascular contours;
              intermediate layers recognize optic disc and vessel bifurcations; deep stages isolate pathological lesions (microaneurysms, hemorrhages, exudates).
            </p>
          </div>
        </div>
      </div>

      {/* Grad-CAM Saliency Interactive Sandbox */}
      <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#22D3EE]" /> Interactive Grad-CAM Attention Heatmap
            </h4>
            <p className="text-xs text-[#A7B1C8]">
              Select a clinical sample to inspect discriminative regions computed via gradient backpropagation
            </p>
          </div>

          {/* Sample selector pills */}
          <div className="flex flex-wrap gap-1.5">
            {samples.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleRunGradcam(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedSample?.file_path === s.file_path
                    ? 'bg-[#8B5CF6] text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]'
                    : 'bg-[#202944] text-[#A7B1C8] hover:text-[#F8FAFC] border border-[#2B3550]'
                }`}
              >
                Grade {s.diagnosis}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {loadingGradcam ? (
          <div className="py-12 text-center text-[#A7B1C8] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#22D3EE]" />
            <p className="text-xs">Computing feature map gradients and generating overlay...</p>
          </div>
        ) : gradcamResult ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Raw Sample */}
            <div className="bg-[#202944] border border-[#2B3550] rounded-xl p-3 text-center space-y-2">
              <span className="text-[11px] font-bold text-[#A7B1C8] uppercase">1. Normalized Fundus</span>
              <div className="aspect-square rounded-lg overflow-hidden bg-[#0B1020] flex items-center justify-center p-2">
                <img
                  src={`/api/uploads/prep_inspect_${selectedSample?.filename}` /* fallback */}
                  onError={(e) => {
                    // If not found in uploads, use overlay base
                    e.target.style.display = 'none';
                  }}
                  alt="Raw"
                  className="max-h-full max-w-full object-contain"
                />
                <div className="text-xs text-[#A7B1C8]">Grade {selectedSample?.diagnosis}: {selectedSample?.class_name}</div>
              </div>
            </div>

            {/* Jet Heatmap */}
            <div className="bg-[#202944] border border-[#2B3550] rounded-xl p-3 text-center space-y-2">
              <span className="text-[11px] font-bold text-[#22D3EE] uppercase">2. Jet Color Map Heatmap</span>
              <div className="aspect-square rounded-lg overflow-hidden bg-[#0B1020] flex items-center justify-center p-2">
                <img
                  src={gradcamResult.heatmap_url}
                  alt="Heatmap"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>

            {/* Superimposed Overlay */}
            <div className="bg-[#202944] border border-[#8B5CF6]/50 rounded-xl p-3 text-center space-y-2 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
              <span className="text-[11px] font-bold text-[#8B5CF6] uppercase">3. Saliency Overlay</span>
              <div className="aspect-square rounded-lg overflow-hidden bg-[#0B1020] flex items-center justify-center p-2">
                <img
                  src={gradcamResult.overlay_url}
                  alt="Overlay"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          </div>
        ) : null}

        {gradcamResult?.explanation && (
          <div className="p-3.5 rounded-lg bg-[#202944] border border-[#2B3550] text-xs text-[#A7B1C8] space-y-1">
            <span className="font-semibold text-[#F8FAFC]">Clinical Saliency Interpretation:</span>
            <p className="leading-relaxed">{gradcamResult.explanation.interpretation}</p>
            <p className="text-[11px] text-[#A7B1C8]/70 italic mt-1">{gradcamResult.explanation.disclaimer}</p>
          </div>
        )}
      </div>

      {/* Model Layer Structural Inspection */}
      <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#8B5CF6]" /> Neural Network Architecture Topology
            </h4>
            <p className="text-xs text-[#A7B1C8]">
              {arch
                ? `${arch.model_name}: ${arch.total_layers} Layers | ${arch.total_parameters.toLocaleString()} Total Parameters`
                : 'Inspecting active model...'}
            </p>
          </div>

          {/* Layer Filter Buttons */}
          <div className="flex items-center gap-1.5">
            {['All', 'Conv', 'Pooling', 'Dense'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  filterCategory === cat
                    ? 'bg-[#8B5CF6] text-white'
                    : 'bg-[#202944] text-[#A7B1C8] hover:text-[#F8FAFC]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loadingArch ? (
          <div className="py-12 text-center text-[#A7B1C8] text-xs">Loading layer parameters...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#2B3550] text-[#A7B1C8]">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Layer Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Output Tensor Shape</th>
                  <th className="py-2.5 px-3 text-right">Parameters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B3550]/40">
                {filteredLayers.map((l) => (
                  <tr key={l.index} className="hover:bg-[#202944]/50 transition-colors">
                    <td className="py-2.5 px-3 text-[#A7B1C8] font-mono">{l.index}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#F8FAFC] font-mono">{l.name}</td>
                    <td className="py-2.5 px-3 text-[#22D3EE]">{l.type}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#202944] border border-[#2B3550] text-[#F8FAFC]">
                        {l.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#A7B1C8]">{l.output_shape}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-[#34D399]">
                      {l.parameters.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

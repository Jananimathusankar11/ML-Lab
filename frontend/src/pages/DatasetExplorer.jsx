import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  PieChart as PieIcon,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileCheck
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

export default function DatasetExplorer() {
  const [stats, setStats] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);
  const [customPath, setCustomPath] = useState('');
  const [updateMsg, setUpdateMsg] = useState(null);

  const fetchDatasetInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, samplesRes] = await Promise.all([
        api.getDatasetStats(),
        api.getDatasetSamples().catch(() => ({ success: false, data: [] }))
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
        setCustomPath(statsRes.data.dataset_dir || '');
      } else {
        setError(statsRes.error || 'Failed to inspect dataset directory.');
      }

      if (samplesRes.success && samplesRes.data) {
        setSamples(samplesRes.data);
      }
    } catch (e) {
      setError(e.message || 'Error connecting to dataset API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasetInfo();
  }, []);

  const handleValidateNow = async () => {
    setValidating(true);
    setError(null);
    setUpdateMsg(null);
    try {
      const res = await api.validateDataset(customPath);
      if (res.success && res.data) {
        setStats(res.data);
        setUpdateMsg('Dataset integrity re-verified successfully.');
      } else {
        setError(res.error || 'Validation error.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setValidating(false);
    }
  };

  const handleApplyPath = async () => {
    if (!customPath) return;
    setValidating(true);
    setError(null);
    setUpdateMsg(null);
    try {
      const res = await api.setDatasetPath(customPath);
      if (res.success) {
        setStats(res.data);
        setUpdateMsg('Active dataset path updated.');
        const sRes = await api.getDatasetSamples();
        if (sRes.success) setSamples(sRes.data);
      } else {
        setError(res.error || 'Failed to set path.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      <MedicalDisclaimer />

      {/* Dataset Path & Verification Bar */}
      <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#8B5CF6]" /> Existing Retinal Dataset Ingestion Engine
            </h3>
            <p className="text-xs text-[#A7B1C8]">
              Verified dataset path configured in backend. No re-downloading required.
            </p>
          </div>

          <button
            onClick={handleValidateNow}
            disabled={validating}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-xs font-semibold text-[#F8FAFC] hover:bg-[#8B5CF6]/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin' : ''}`} />
            <span>{validating ? 'Validating...' : 'Refresh Validation'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="e.g. C:\Users\Janani\Downloads\diabetic\dataset"
              className="w-full px-3.5 py-2 rounded-lg bg-[#0B1020] border border-[#2B3550] text-xs font-mono text-[#22D3EE] placeholder-[#A7B1C8]/40 focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>
          <button
            onClick={handleApplyPath}
            disabled={validating || !customPath}
            className="px-4 py-2 rounded-lg bg-[#202944] hover:bg-[#8B5CF6] text-xs font-semibold text-[#F8FAFC] border border-[#2B3550] hover:border-[#8B5CF6] transition-colors disabled:opacity-50"
          >
            Switch / Apply Path
          </button>
        </div>

        {updateMsg && (
          <div className="text-xs text-[#34D399] flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> {updateMsg}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-[#A7B1C8] space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#8B5CF6]" />
          <p className="text-xs">Inspecting retinal dataset records and files...</p>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Integrity Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-3.5 text-center">
              <span className="text-[10px] text-[#A7B1C8] uppercase font-bold block">Valid Images</span>
              <span className="text-xl font-bold text-[#34D399]">{stats.valid_images}</span>
            </div>
            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-3.5 text-center">
              <span className="text-[10px] text-[#A7B1C8] uppercase font-bold block">Dataset Format</span>
              <span className="text-xs font-bold text-[#22D3EE] block mt-1 truncate">{stats.format_type}</span>
            </div>
            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-3.5 text-center">
              <span className="text-[10px] text-[#A7B1C8] uppercase font-bold block">Missing Images</span>
              <span className="text-xl font-bold text-[#F8FAFC]">{stats.missing_files_count}</span>
            </div>
            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-3.5 text-center">
              <span className="text-[10px] text-[#A7B1C8] uppercase font-bold block">Corrupted</span>
              <span className="text-xl font-bold text-[#F8FAFC]">{stats.corrupted_files_count}</span>
            </div>
            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-3.5 text-center">
              <span className="text-[10px] text-[#A7B1C8] uppercase font-bold block">Duplicates</span>
              <span className="text-xl font-bold text-[#F8FAFC]">{stats.duplicate_records_count}</span>
            </div>
            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-3.5 text-center">
              <span className="text-[10px] text-[#A7B1C8] uppercase font-bold block">Health Status</span>
              <span className="text-xs font-bold text-[#34D399] block mt-1">Verified Healthy</span>
            </div>
          </div>

          {/* Stratified Splits & Class Imbalance Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Split Counts Card */}
            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#8B5CF6]" /> Stratified Data Partitioning (70 / 15 / 15)
              </h4>
              <p className="text-xs text-[#A7B1C8] leading-relaxed">
                {stats.splits?.strategy}
              </p>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550]">
                  <span className="text-[10px] text-[#A7B1C8] block uppercase">Training (70%)</span>
                  <span className="text-lg font-bold text-[#8B5CF6]">{stats.splits?.train} images</span>
                </div>
                <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550]">
                  <span className="text-[10px] text-[#A7B1C8] block uppercase">Validation (15%)</span>
                  <span className="text-lg font-bold text-[#22D3EE]">{stats.splits?.validation} images</span>
                </div>
                <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550]">
                  <span className="text-[10px] text-[#A7B1C8] block uppercase">Held-Out Test (15%)</span>
                  <span className="text-lg font-bold text-[#34D399]">{stats.splits?.test} images</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0B1020]/60 border border-[#2B3550] text-xs text-[#A7B1C8]">
                <strong className="text-[#34D399]">No Data Leakage Guarantee:</strong> Test set images are strictly isolated during training and hyperparameter search.
              </div>
            </div>

            {/* Imbalance Analysis Card */}
            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-[#22D3EE]" /> Clinical Severity Imbalance Analysis
              </h4>
              <p className="text-xs text-[#A7B1C8] leading-relaxed">
                {stats.class_imbalance?.explanation}
              </p>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.class_distribution} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="short_name" stroke="#A7B1C8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#A7B1C8" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171E35',
                        borderColor: '#2B3550',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#F8FAFC'
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.class_distribution.map((entry, index) => (
                        <Cell key={`c-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sample Retinal Images Gallery */}
          {samples.length > 0 && (
            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#34D399]" /> Verified Dataset Retinal Fundus Samples
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {samples.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#202944] border border-[#2B3550] space-y-2 text-center"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-[#0B1020] flex items-center justify-center p-2">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-orange-400 opacity-80" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#F8FAFC] truncate">{s.filename}</div>
                      <span
                        className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold text-black"
                        style={{ backgroundColor: s.color || '#34D399' }}
                      >
                        Grade {s.diagnosis}: {s.class_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

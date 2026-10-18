import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  RefreshCw,
  Server,
  HardDrive
} from 'lucide-react';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [datasetDir, setDatasetDir] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getSettings();
      if (res.success && res.data) {
        setSettings(res.data);
        setDatasetDir(res.data.active_dataset_dir || '');
      }
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const res = await api.updateSettings({
        active_dataset_dir: datasetDir,
      });
      if (res.success) {
        setStatusMsg('System settings saved successfully.');
        fetchSettings();
      } else {
        setErrorMsg(res.error || 'Failed to update settings.');
      }
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <MedicalDisclaimer />

      <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC]">
              System Configuration & Runtime Environment
            </h3>
            <p className="text-xs text-[#A7B1C8]">
              Manage local dataset paths, trained weight locations, and backend server telemetry.
            </p>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4" /> {statusMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-[#A7B1C8]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#8B5CF6] mb-2" />
            Loading settings...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Active Dataset Location */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#F8FAFC] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#8B5CF6]" /> Active Dataset Directory Path
              </label>
              <p className="text-[11px] text-[#A7B1C8]">
                Path containing APTOS 2019 / EyePACS `train.csv` and retinal images.
              </p>
              <input
                type="text"
                value={datasetDir}
                onChange={(e) => setDatasetDir(e.target.value)}
                placeholder="e.g. C:\Users\Janani\Downloads\diabetic\dataset"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-[#2B3550] text-xs font-mono text-[#22D3EE] focus:outline-none focus:border-[#8B5CF6]"
              />

              {/* Candidates detected */}
              {settings?.dataset_candidates && settings.dataset_candidates.length > 0 && (
                <div className="pt-1 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#A7B1C8]">Detected on disk:</span>
                  <div className="flex flex-wrap gap-2">
                    {settings.dataset_candidates.map((c, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setDatasetDir(c.path)}
                        className="px-2.5 py-1 rounded-md bg-[#202944] hover:bg-[#8B5CF6]/20 border border-[#2B3550] text-[11px] font-mono text-[#F8FAFC] transition-colors"
                      >
                        {c.name}: {c.path}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* System Info Strip */}
            <div className="pt-4 border-t border-[#2B3550] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#202944] border border-[#2B3550] space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#A7B1C8] block">Deep Learning Engine</span>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#A7B1C8]">Framework:</span>
                  <span className="text-[#22D3EE] font-bold">{settings?.framework}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#A7B1C8]">Python Runtime:</span>
                  <span className="text-[#F8FAFC]">{settings?.python_version}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#A7B1C8]">Model Status:</span>
                  <span className="text-[#34D399] font-bold">{settings?.model_status}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#202944] border border-[#2B3550] space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#A7B1C8] block">Database & Storage</span>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="text-[#A7B1C8]">SQLite Database:</div>
                  <div className="text-[#F8FAFC] break-all">{settings?.database_path}</div>
                  <div className="text-[#A7B1C8] pt-1">Active Model Weights:</div>
                  <div className="text-[#8B5CF6] break-all">{settings?.model_path}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

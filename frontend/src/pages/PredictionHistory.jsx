import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileText,
  X
} from 'lucide-react';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function PredictionHistory() {
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {
        limit,
        offset: page * limit,
        search,
      };
      if (classFilter !== '') {
        params.class = classFilter;
      }
      const res = await api.getHistory(params);
      if (res.success && res.data) {
        setHistory(res.data.predictions || []);
        setTotal(res.data.total || 0);
      }
    } catch (e) {
      console.error('History fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, classFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchHistory();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete inference record ${id}?`)) return;
    try {
      await api.deletePrediction(id);
      fetchHistory();
      if (selectedRecord?.id === id) setSelectedRecord(null);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <MedicalDisclaimer />

      {/* Control Strip: Search & Filter */}
      <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
              <History className="w-4 h-4 text-[#8B5CF6]" /> SQLite Clinical Prediction Audit Trail
            </h3>
            <p className="text-xs text-[#A7B1C8]">
              Search, filter, and inspect verified historical fundus classifications.
            </p>
          </div>

          <div className="text-xs text-[#A7B1C8]">
            Total Inferences: <strong className="text-[#22D3EE] font-mono">{total}</strong>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-[#A7B1C8] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID or image filename..."
              className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[#0B1020] border border-[#2B3550] text-xs text-[#F8FAFC] placeholder-[#A7B1C8]/40 focus:outline-none focus:border-[#8B5CF6]"
            />
          </form>

          {/* Class Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#A7B1C8]" />
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 rounded-lg bg-[#0B1020] border border-[#2B3550] text-xs text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="">All Severity Grades</option>
              <option value="0">Grade 0 — No DR</option>
              <option value="1">Grade 1 — Mild</option>
              <option value="2">Grade 2 — Moderate</option>
              <option value="3">Grade 3 — Severe</option>
              <option value="4">Grade 4 — Proliferative DR</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Records Table */}
      <div className="bg-[#171E35] border border-[#2B3550] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-[#A7B1C8] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#8B5CF6]" />
            <p className="text-xs">Loading prediction audit records from database...</p>
          </div>
        ) : history.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2B3550] text-[#A7B1C8] bg-[#0B1020]/40">
                    <th className="py-3 px-4">Prediction ID</th>
                    <th className="py-3 px-4">Filename</th>
                    <th className="py-3 px-4">Predicted Severity</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3550]/40">
                  {history.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRecord(row)}
                      className="hover:bg-[#202944]/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#8B5CF6]">{row.id}</td>
                      <td className="py-3 px-4 font-medium text-[#F8FAFC] max-w-[160px] truncate">
                        {row.filename}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30">
                          Grade {row.predicted_class}: {row.class_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#34D399]">
                        {Math.round(row.confidence * 1000) / 10}%
                      </td>
                      <td className="py-3 px-4 font-mono text-[#22D3EE]">{row.processing_time_ms} ms</td>
                      <td className="py-3 px-4 text-[#A7B1C8]">{row.timestamp}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <a
                          href={`/api/report/${row.id}?format=html`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center p-1.5 rounded-md bg-[#202944] text-[#22D3EE] hover:bg-[#8B5CF6]/20 transition-colors"
                          title="Print Clinical Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={(e) => handleDelete(row.id, e)}
                          className="inline-flex items-center p-1.5 rounded-md bg-[#202944] text-rose-400 hover:bg-rose-500/20 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="p-4 border-t border-[#2B3550] flex items-center justify-between text-xs text-[#A7B1C8]">
              <span>Page {page + 1} of {totalPages}</span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  className="p-1.5 rounded-lg bg-[#202944] border border-[#2B3550] hover:text-[#F8FAFC] disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg bg-[#202944] border border-[#2B3550] hover:text-[#F8FAFC] disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-16 text-center text-xs text-[#A7B1C8] space-y-2">
            <Clock className="w-8 h-8 mx-auto text-[#A7B1C8]/40" />
            <p>No matching predictions found in database.</p>
          </div>
        )}
      </div>

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171E35] border border-[#2B3550] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#2B3550] pb-3">
              <div>
                <span className="text-[10px] text-[#A7B1C8] font-mono">RECORD {selectedRecord.id}</span>
                <h3 className="text-base font-bold text-[#F8FAFC]">
                  Grade {selectedRecord.predicted_class} — {selectedRecord.class_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg hover:bg-[#202944] text-[#A7B1C8] hover:text-[#F8FAFC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550]">
                <span className="text-[10px] text-[#A7B1C8] block uppercase">Filename</span>
                <span className="font-semibold text-[#F8FAFC]">{selectedRecord.filename}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550]">
                <span className="text-[10px] text-[#A7B1C8] block uppercase">Confidence</span>
                <span className="font-bold text-[#34D399]">
                  {Math.round(selectedRecord.confidence * 1000) / 10}%
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550]">
                <span className="text-[10px] text-[#A7B1C8] block uppercase">Latency</span>
                <span className="font-mono text-[#22D3EE]">{selectedRecord.processing_time_ms} ms</span>
              </div>
              <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550]">
                <span className="text-[10px] text-[#A7B1C8] block uppercase">Model Version</span>
                <span className="font-mono text-[#F8FAFC]">{selectedRecord.model_version}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <a
                href={`/api/report/${selectedRecord.id}?format=html`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_12px_rgba(139,92,246,0.3)]"
              >
                <Download className="w-4 h-4" /> Open Full Printable Clinical Report
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

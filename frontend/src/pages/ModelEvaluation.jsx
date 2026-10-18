import React, { useState, useEffect } from 'react';
import {
  Award,
  RefreshCw,
  BarChart3,
  Layers,
  FileText,
  Download,
  AlertTriangle,
  Info,
  CheckCircle2,
  TrendingUp
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

export default function ModelEvaluation() {
  const [evalData, setEvalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvaluation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getEvaluation();
      if (res.success && res.data) {
        setEvalData(res.data);
      } else {
        setError(res.error || 'Evaluation data pending.');
      }
    } catch (e) {
      setError(e.message || 'Failed to connect to evaluation API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluation();
  }, []);

  const handleRunEvaluation = async () => {
    setEvaluating(true);
    setError(null);
    try {
      const res = await api.runEvaluation();
      if (res.success && res.data) {
        setEvalData(res.data);
      } else {
        setError(res.error || 'Evaluation failed.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setEvaluating(false);
    }
  };

  const handleExportCSV = () => {
    if (!evalData?.class_metrics) return;
    const headers = ['Class ID', 'Class Name', 'Precision (%)', 'Recall (%)', 'F1-Score (%)', 'Test Support'];
    const rows = evalData.class_metrics.map((m) => [
      m.class_id,
      m.name,
      m.precision,
      m.recall,
      m.f1_score,
      m.support,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `retina_ai_evaluation_metrics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cm = evalData?.confusion_matrix || [];
  const classNames = evalData?.class_names || ['No DR', 'Mild', 'Moderate', 'Severe', 'Prolif DR'];

  return (
    <div className="space-y-6">
      <MedicalDisclaimer />

      {/* Header Bar */}
      <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <Award className="w-4 h-4 text-[#8B5CF6]" /> Held-Out Test Split Performance & Confusion Matrix
          </h3>
          <p className="text-xs text-[#A7B1C8]">
            Rigorous evaluation on independent held-out data never seen during model training.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {evalData && (
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg bg-[#202944] border border-[#2B3550] text-xs font-semibold text-[#F8FAFC] hover:border-[#22D3EE] flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#22D3EE]" /> Export CSV
            </button>
          )}

          <button
            onClick={handleRunEvaluation}
            disabled={evaluating}
            className="px-3.5 py-1.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(139,92,246,0.3)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
            <span>{evaluating ? 'Evaluating...' : 'Re-Run Test Evaluation'}</span>
          </button>
        </div>
      </div>

      {error && !evalData && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-200">Evaluation Pending</div>
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-[#A7B1C8] space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#8B5CF6]" />
          <p className="text-xs">Computing test set confusion matrix and clinical diagnostic metrics...</p>
        </div>
      ) : evalData ? (
        <div className="space-y-6">
          {/* Top 4 Medical Performance KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-4 text-center">
              <span className="text-[10px] text-[#A7B1C8] uppercase font-bold tracking-wider block">Overall Accuracy</span>
              <span className="text-2xl font-black text-[#34D399] font-mono">{evalData.accuracy}%</span>
              <span className="text-[10px] text-[#A7B1C8] block mt-0.5">{evalData.test_samples_count} Test Samples</span>
            </div>

            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-4 text-center">
              <span className="text-[10px] text-[#A7B1C8] uppercase font-bold tracking-wider block">Macro F1-Score</span>
              <span className="text-2xl font-black text-[#8B5CF6] font-mono">{evalData.macro_f1}%</span>
              <span className="text-[10px] text-[#A7B1C8] block mt-0.5">Equal Class Weighting</span>
            </div>

            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-4 text-center">
              <span className="text-[10px] text-[#A7B1C8] uppercase font-bold tracking-wider block">Macro Precision</span>
              <span className="text-2xl font-black text-[#22D3EE] font-mono">{evalData.macro_precision}%</span>
              <span className="text-[10px] text-[#A7B1C8] block mt-0.5">Specificity Control</span>
            </div>

            <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-4 text-center">
              <span className="text-[10px] text-[#A7B1C8] uppercase font-bold tracking-wider block">Macro Recall</span>
              <span className="text-2xl font-black text-[#FBBF24] font-mono">{evalData.macro_recall}%</span>
              <span className="text-[10px] text-[#A7B1C8] block mt-0.5">Sensitivity to Disease</span>
            </div>
          </div>

          {/* Visualization Row: Confusion Matrix Heatmap + Per-Class F1 Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 5x5 Confusion Matrix Heatmap (6 Cols) */}
            <div className="lg:col-span-6 bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                  5×5 Multi-Class Confusion Matrix Heatmap
                </h4>
                <p className="text-[11px] text-[#A7B1C8]">Rows: Ground Truth | Columns: Model Prediction</p>
              </div>

              {cm.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[320px]">
                    {/* Header columns */}
                    <div className="grid grid-cols-6 gap-1 text-center font-bold text-[10px] text-[#A7B1C8] mb-1">
                      <div>True \ Pred</div>
                      {classNames.map((name, i) => (
                        <div key={i} className="truncate">{name}</div>
                      ))}
                    </div>

                    {/* Matrix Rows */}
                    {cm.map((row, rIdx) => (
                      <div key={rIdx} className="grid grid-cols-6 gap-1 mb-1 items-center">
                        <div className="text-[10px] font-bold text-[#A7B1C8] truncate text-right pr-2">
                          {classNames[rIdx]}
                        </div>
                        {row.map((val, cIdx) => {
                          const isDiagonal = rIdx === cIdx;
                          const intensity = val > 0 ? (isDiagonal ? 'bg-[#8B5CF6]' : 'bg-rose-500/60') : 'bg-[#202944]';
                          return (
                            <div
                              key={cIdx}
                              className={`h-11 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all ${intensity} ${
                                isDiagonal ? 'text-white border border-[#22D3EE]/50 shadow-[0_0_8px_rgba(139,92,246,0.3)]' : 'text-[#F8FAFC]'
                              }`}
                              title={`True: ${classNames[rIdx]} -> Pred: ${classNames[cIdx]} (${val})`}
                            >
                              {val}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[#A7B1C8]">No matrix data.</div>
              )}

              <div className="flex items-center justify-between text-[10px] text-[#A7B1C8] pt-2 border-t border-[#2B3550]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#8B5CF6]" />
                  <span>Diagonal: Correct Classifications</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500/60" />
                  <span>Off-Diagonal: Clinical Misclassifications</span>
                </div>
              </div>
            </div>

            {/* Per-Class Performance Bar Chart (6 Cols) */}
            <div className="lg:col-span-6 bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                  Class-Wise Diagnostic Precision & Recall
                </h4>
                <p className="text-[11px] text-[#A7B1C8]">Sensitivity across each diabetic retinopathy grade</p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={evalData.class_metrics || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis dataKey="short_name" stroke="#A7B1C8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#A7B1C8" fontSize={10} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      formatter={(val, name) => [`${val}%`, name]}
                      contentStyle={{
                        backgroundColor: '#171E35',
                        borderColor: '#2B3550',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#F8FAFC'
                      }}
                    />
                    <Bar dataKey="precision" fill="#8B5CF6" name="Precision" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="recall" fill="#22D3EE" name="Recall (Sensitivity)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="f1_score" fill="#34D399" name="F1 Score" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550] text-[11px] text-[#A7B1C8]">
                <strong className="text-[#FBBF24]">Clinical Note: </strong>
                High recall on Grade 3 (Severe) and Grade 4 (Proliferative DR) is clinically vital to avoid false negatives on vision-critical conditions.
              </div>
            </div>
          </div>

          {/* Classification Report Table */}
          <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
              Scikit-Learn Classification Report Breakdown
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2B3550] text-[#A7B1C8]">
                    <th className="py-2.5 px-3">Grade</th>
                    <th className="py-2.5 px-3">Severity Class</th>
                    <th className="py-2.5 px-3 text-right">Precision (%)</th>
                    <th className="py-2.5 px-3 text-right">Recall / Sensitivity (%)</th>
                    <th className="py-2.5 px-3 text-right">F1-Score (%)</th>
                    <th className="py-2.5 px-3 text-right">Test Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3550]/40">
                  {(evalData.class_metrics || []).map((m) => (
                    <tr key={m.class_id} className="hover:bg-[#202944]/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#8B5CF6]">Grade {m.class_id}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#F8FAFC]">{m.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#F8FAFC]">{m.precision}%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#22D3EE] font-semibold">{m.recall}%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#34D399] font-bold">{m.f1_score}%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#A7B1C8]">{m.support}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

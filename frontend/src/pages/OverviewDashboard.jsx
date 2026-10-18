import React from 'react';
import {
  Database,
  Image as ImageIcon,
  Activity,
  Award,
  PlayCircle,
  Eye,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import MetricCard from '../components/MetricCard';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function OverviewDashboard({ dashboardData, loading, setActiveTab }) {
  const data = dashboardData?.data || {};

  const classDist = data.class_distribution || [
    { short_name: 'No DR', count: 7, color: '#34D399' },
    { short_name: 'Mild', count: 7, color: '#38BDF8' },
    { short_name: 'Moderate', count: 7, color: '#FBBF24' },
    { short_name: 'Severe', count: 7, color: '#FB923C' },
    { short_name: 'Prolif DR', count: 7, color: '#FB7185' },
  ];

  const curves = data.training_curves;
  const epochsCount = curves?.accuracy?.length || curves?.train_acc?.length || 0;

  const chartHistory = [];
  if (curves) {
    const accList = curves.train_acc || curves.accuracy || [];
    const valAccList = curves.val_acc || curves.val_accuracy || [];
    const lossList = curves.train_loss || curves.loss || [];
    const valLossList = curves.val_loss || [];

    for (let i = 0; i < accList.length; i++) {
      chartHistory.push({
        epoch: `Ep ${i + 1}`,
        train_acc: accList[i],
        val_acc: valAccList[i] || null,
        train_loss: lossList[i],
        val_loss: valLossList[i] || null,
      });
    }
  }

  const recent = data.recent_predictions || [];

  return (
    <div className="space-y-6">
      <MedicalDisclaimer />

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Verified Dataset Images"
          value={loading ? '...' : data.total_images ?? 0}
          subtitle="APTOS/EyePACS verified fundus"
          icon={Database}
          accent="purple"
        />
        <MetricCard
          title="Diagnostic Inferences"
          value={loading ? '...' : data.total_predictions ?? 0}
          subtitle="Logged in SQLite audit trail"
          icon={ImageIcon}
          accent="cyan"
        />
        <MetricCard
          title="Held-Out Test Accuracy"
          value={
            loading
              ? '...'
              : data.test_accuracy !== undefined && data.test_accuracy !== 'N/A'
              ? `${data.test_accuracy}%`
              : 'Evaluation Pending'
          }
          subtitle="Independent stratified test split"
          icon={Award}
          accent="emerald"
        />
        <MetricCard
          title="Model Engine Status"
          value={loading ? '...' : data.model_status || 'Ready'}
          subtitle={data.training_status === 'running' ? 'Training in progress...' : 'Ready for real-time inference'}
          icon={Activity}
          accent={data.training_status === 'running' ? 'amber' : 'purple'}
        />
      </div>

      {/* Visualization Row: Class Distribution & Model Learning Curves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Distribution Card */}
        <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                Dataset Class Distribution (Grades 0–4)
              </h3>
              <p className="text-xs text-[#A7B1C8]">
                Proportional breakdown of clinical severity stages in existing dataset
              </p>
            </div>
            <button
              onClick={() => setActiveTab('dataset')}
              className="text-xs text-[#22D3EE] hover:text-[#8B5CF6] font-medium flex items-center gap-1 transition-colors"
            >
              Explorer <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classDist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B3550" opacity={0.5} />
                <XAxis dataKey="short_name" stroke="#A7B1C8" fontSize={11} tickLine={false} />
                <YAxis stroke="#A7B1C8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171E35',
                    borderColor: '#2B3550',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC'
                  }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Samples" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Training & Validation Curves */}
        <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                CNN Convergence & Learning Accuracy
              </h3>
              <p className="text-xs text-[#A7B1C8]">
                {epochsCount > 0
                  ? `Training history across ${epochsCount} epochs`
                  : 'Awaiting training experiment run'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('training')}
              className="text-xs text-[#8B5CF6] hover:text-[#22D3EE] font-medium flex items-center gap-1 transition-colors"
            >
              Train Model <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-64 w-full">
            {chartHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2B3550" opacity={0.5} />
                  <XAxis dataKey="epoch" stroke="#A7B1C8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#A7B1C8" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#171E35',
                      borderColor: '#2B3550',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#F8FAFC'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="train_acc"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Train Accuracy (%)"
                  />
                  <Line
                    type="monotone"
                    dataKey="val_acc"
                    stroke="#22D3EE"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Validation Accuracy (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <PlayCircle className="w-8 h-8 text-[#A7B1C8]/50" />
                <p className="text-xs text-[#A7B1C8]">No training curves recorded yet.</p>
                <button
                  onClick={() => setActiveTab('training')}
                  className="px-3 py-1.5 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-xs text-[#F8FAFC] hover:bg-[#8B5CF6]/30 transition-colors"
                >
                  Start First Training Run
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Predictions & Quick Launch Pad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Inferences Table */}
        <div className="lg:col-span-2 bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                Recent Diagnostic Inferences
              </h3>
              <p className="text-xs text-[#A7B1C8]">Latest analyzed retinal fundus photographs</p>
            </div>
            <button
              onClick={() => setActiveTab('history')}
              className="text-xs text-[#22D3EE] hover:text-[#8B5CF6] font-medium flex items-center gap-1 transition-colors"
            >
              Full History <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            {recent.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2B3550] text-[#A7B1C8]">
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Filename</th>
                    <th className="py-2.5 px-3">Predicted Severity</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3550]/50">
                  {recent.map((p) => (
                    <tr key={p.id} className="hover:bg-[#202944]/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[#8B5CF6]">{p.id}</td>
                      <td className="py-2.5 px-3 font-medium text-[#F8FAFC] truncate max-w-[140px]">
                        {p.filename}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30">
                          Grade {p.predicted_class}: {p.class_name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#34D399] font-semibold">
                        {roundNum(p.confidence * 100)}%
                      </td>
                      <td className="py-2.5 px-3 text-[#A7B1C8]/80">{p.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-xs text-[#A7B1C8] space-y-2">
                <Clock className="w-6 h-6 mx-auto text-[#A7B1C8]/40" />
                <p>No predictions logged yet. Try analyzing an image!</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Launchpad & Protocol Guide */}
        <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#22D3EE]" />
              <h3 className="text-sm font-bold text-[#F8FAFC]">Clinical Workflow Actions</h3>
            </div>
            <p className="text-xs text-[#A7B1C8] leading-relaxed mb-4">
              Execute core workflow tasks directly through the integrated RetinaAI toolchain.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => setActiveTab('detect')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[#8B5CF6]/20 to-[#8B5CF6]/10 border border-[#8B5CF6]/30 hover:border-[#8B5CF6] text-left transition-all group"
              >
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC]">1. Run Real-Time Prediction</div>
                  <div className="text-[10px] text-[#A7B1C8]">Upload retinal fundus photo & get 5-class distribution</div>
                </div>
                <Eye className="w-4 h-4 text-[#8B5CF6] group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => setActiveTab('preprocess')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#202944] border border-[#2B3550] hover:border-[#22D3EE]/50 text-left transition-all group"
              >
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC]">2. Inspect Preprocessing</div>
                  <div className="text-[10px] text-[#A7B1C8]">Examine circular crop, CLAHE & Ben Graham filters</div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#22D3EE] group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setActiveTab('features')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#202944] border border-[#2B3550] hover:border-[#34D399]/50 text-left transition-all group"
              >
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC]">3. Grad-CAM Saliency Analysis</div>
                  <div className="text-[10px] text-[#A7B1C8]">Inspect discriminative attention heatmaps</div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#34D399] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550] text-[11px] text-[#A7B1C8]">
            <span className="font-semibold text-[#F8FAFC]">Dataset Path:</span>{' '}
            <span className="font-mono text-[#22D3EE] break-all">{data.dataset_dir || 'Auto-Detected'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function roundNum(val) {
  if (typeof val !== 'number') return val;
  return Math.round(val * 10) / 10;
}

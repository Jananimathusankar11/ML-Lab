import React, { useState, useEffect, useRef } from 'react';
import {
  PlayCircle,
  StopCircle,
  RefreshCw,
  Terminal,
  Activity,
  Layers,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { api } from '../services/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function ModelTraining({ onTrainingFinish }) {
  // Config form state
  const [architecture, setArchitecture] = useState('Custom CNN');
  const [epochs, setEpochs] = useState(15);
  const [batchSize, setBatchSize] = useState(16);
  const [learningRate, setLearningRate] = useState(0.0005);

  // Status & Telemetry
  const [trainingStatus, setTrainingStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [totalEpochs, setTotalEpochs] = useState(0);
  const [currentMetrics, setCurrentMetrics] = useState({});
  const [historyMetrics, setHistoryMetrics] = useState({ train_acc: [], val_acc: [], train_loss: [], val_loss: [] });
  const [logs, setLogs] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [launching, setLaunching] = useState(false);

  const logsEndRef = useRef(null);

  // Poll status when running
  useEffect(() => {
    let intervalId = null;

    const checkStatus = async () => {
      try {
        const res = await api.getTrainingStatus();
        if (res.success && res.data) {
          const s = res.data;
          setTrainingStatus(s.status);
          setProgress(s.progress || 0);
          setCurrentEpoch(s.current_epoch || 0);
          setTotalEpochs(s.total_epochs || 0);
          setCurrentMetrics(s.current_metrics || {});
          setHistoryMetrics(s.metrics || { train_acc: [], val_acc: [], train_loss: [], val_loss: [] });
          setLogs(s.logs || []);

          if (s.status === 'completed' && onTrainingFinish) {
            onTrainingFinish();
          }
        }
      } catch (e) {
        console.error('Error polling training status:', e);
      }
    };

    checkStatus();
    intervalId = setInterval(checkStatus, 2500);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [trainingStatus]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStartTraining = async (e) => {
    e.preventDefault();
    setLaunching(true);
    setErrorMsg(null);

    try {
      const res = await api.startTraining({
        architecture,
        epochs: Number(epochs),
        batch_size: Number(batchSize),
        learning_rate: Number(learningRate),
      });

      if (res.success) {
        setTrainingStatus('running');
      } else {
        setErrorMsg(res.error || 'Failed to start training.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error communicating with training API.');
    } finally {
      setLaunching(false);
    }
  };

  const handleStopTraining = async () => {
    try {
      await api.stopTraining();
    } catch (e) {
      console.error('Stop error:', e);
    }
  };

  const isRunning = trainingStatus === 'running';

  // Format line chart data
  const chartData = [];
  const accList = historyMetrics.train_acc || [];
  const valAccList = historyMetrics.val_acc || [];
  const lossList = historyMetrics.train_loss || [];
  const valLossList = historyMetrics.val_loss || [];

  for (let i = 0; i < accList.length; i++) {
    chartData.push({
      epoch: `Ep ${i + 1}`,
      train_acc: accList[i],
      val_acc: valAccList[i] || null,
      train_loss: lossList[i],
      val_loss: valLossList[i] || null,
    });
  }

  return (
    <div className="space-y-6">
      <MedicalDisclaimer />

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Training Hyperparameters Form & Telemetry Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hyperparameters Config Form (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-sm font-bold text-[#F8FAFC]">Training Hyperparameters</h3>
            </div>
            <p className="text-xs text-[#A7B1C8]">
              Configure model architecture, optimizer tuning, and training iterations.
            </p>

            <form onSubmit={handleStartTraining} className="space-y-4 pt-2">
              {/* Architecture Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A7B1C8]">Model Architecture</label>
                <select
                  disabled={isRunning}
                  value={architecture}
                  onChange={(e) => setArchitecture(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B1020] border border-[#2B3550] text-xs font-medium text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="Custom CNN">Custom Deep CNN (4 Conv Blocks)</option>
                  <option value="MobileNetV2">MobileNetV2 Transfer Learning</option>
                  <option value="EfficientNetB0">EfficientNetB0 Transfer Learning</option>
                </select>
              </div>

              {/* Epochs */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-semibold text-[#A7B1C8]">Epochs</label>
                  <span className="font-mono text-[#22D3EE]">{epochs}</span>
                </div>
                <input
                  type="number"
                  min="2"
                  max="100"
                  disabled={isRunning}
                  value={epochs}
                  onChange={(e) => setEpochs(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B1020] border border-[#2B3550] text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* Batch Size */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A7B1C8]">Batch Size</label>
                <select
                  disabled={isRunning}
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B1020] border border-[#2B3550] text-xs font-medium text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="8">8 (Low memory)</option>
                  <option value="16">16 (Recommended)</option>
                  <option value="32">32 (Fast batch)</option>
                </select>
              </div>

              {/* Learning Rate */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A7B1C8]">Learning Rate (Adam)</label>
                <select
                  disabled={isRunning}
                  value={learningRate}
                  onChange={(e) => setLearningRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B1020] border border-[#2B3550] text-xs font-medium text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="0.001">0.001 (Fast convergence)</option>
                  <option value="0.0005">0.0005 (Recommended)</option>
                  <option value="0.0001">0.0001 (Fine-tuning)</option>
                </select>
              </div>

              {/* Advanced Pipeline Indicators */}
              <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550] space-y-1.5 text-[11px] text-[#A7B1C8]">
                <div className="flex items-center justify-between">
                  <span>Class Weighting:</span>
                  <span className="text-[#34D399] font-semibold">Inverse Frequency Enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data Augmentation:</span>
                  <span className="text-[#34D399] font-semibold">Active on Train Split Only</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Loss Function:</span>
                  <span className="font-mono text-[#F8FAFC]">Sparse Categorical CE</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {!isRunning ? (
                  <button
                    type="submit"
                    disabled={launching}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>{launching ? 'Launching Worker...' : 'Start Training Model'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopTraining}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-rose-500/20 text-[#FB7185] border border-rose-500/40 hover:bg-rose-500/30 transition-all"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span>Halt Training</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Live Training Telemetry & Logs Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Progress Banner */}
          <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-[#A7B1C8]">Live Telemetry</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isRunning
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        : trainingStatus === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-[#202944] text-[#A7B1C8] border border-[#2B3550]'
                    }`}
                  >
                    {isRunning
                      ? `Training Epoch ${currentEpoch}/${totalEpochs}`
                      : trainingStatus === 'completed'
                      ? 'Training Completed & Model Saved'
                      : 'Worker Idle'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#F8FAFC] tracking-tight">
                  {architecture} Optimizer Monitor
                </h3>
              </div>

              {/* Progress Percentage */}
              <div className="text-right">
                <span className="text-xs text-[#A7B1C8] block">Overall Progress</span>
                <span className="text-2xl font-black text-[#22D3EE] font-mono">{progress}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-[#0B1020] border border-[#2B3550] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Current Epoch Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-[#202944] border border-[#2B3550]">
                <span className="text-[10px] text-[#A7B1C8] block uppercase">Train Acc</span>
                <span className="font-bold text-[#8B5CF6] font-mono">
                  {currentMetrics.train_acc !== undefined ? `${currentMetrics.train_acc}%` : '--'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#202944] border border-[#2B3550]">
                <span className="text-[10px] text-[#A7B1C8] block uppercase">Val Acc</span>
                <span className="font-bold text-[#22D3EE] font-mono">
                  {currentMetrics.val_acc !== undefined ? `${currentMetrics.val_acc}%` : '--'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#202944] border border-[#2B3550]">
                <span className="text-[10px] text-[#A7B1C8] block uppercase">Train Loss</span>
                <span className="font-bold text-[#F8FAFC] font-mono">
                  {currentMetrics.train_loss !== undefined ? currentMetrics.train_loss : '--'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#202944] border border-[#2B3550]">
                <span className="text-[10px] text-[#A7B1C8] block uppercase">Val Loss</span>
                <span className="font-bold text-[#34D399] font-mono">
                  {currentMetrics.val_loss !== undefined ? currentMetrics.val_loss : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Real-Time Learning Curve Visualizer */}
          <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
              Epoch-by-Epoch Convergence Curves
            </h4>
            <div className="h-48 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2B3550" opacity={0.5} />
                    <XAxis dataKey="epoch" stroke="#A7B1C8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#A7B1C8" fontSize={10} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171E35',
                        borderColor: '#2B3550',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#F8FAFC'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line
                      type="monotone"
                      dataKey="train_acc"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      name="Train Accuracy (%)"
                    />
                    <Line
                      type="monotone"
                      dataKey="val_acc"
                      stroke="#22D3EE"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      name="Validation Accuracy (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#A7B1C8]">
                  Curves will plot here as each epoch finishes.
                </div>
              )}
            </div>
          </div>

          {/* Real-Time Live Logs Terminal */}
          <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#22D3EE]" /> Training Execution Stream
              </span>
              <span className="text-[10px] text-[#A7B1C8] font-mono">{logs.length} lines</span>
            </div>

            <div className="h-36 overflow-y-auto bg-[#080D19] rounded-lg p-3 font-mono text-[11px] text-[#A7B1C8] space-y-1 border border-[#2B3550]/60">
              {logs.length > 0 ? (
                logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    <span className="text-[#8B5CF6] mr-2">❯</span>
                    <span className={log.includes('Accuracy') || log.includes('complete') ? 'text-[#34D399]' : 'text-[#F8FAFC]'}>
                      {log}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-[#A7B1C8]/50 italic">Awaiting training start...</div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

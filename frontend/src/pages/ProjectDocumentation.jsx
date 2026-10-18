import React from 'react';
import {
  BookOpen,
  Eye,
  Layers,
  Cpu,
  Database,
  ShieldAlert,
  Terminal,
  Activity,
  CheckCircle2,
  Code
} from 'lucide-react';
import MedicalDisclaimer from '../components/MedicalDisclaimer';

export default function ProjectDocumentation() {
  return (
    <div className="space-y-6">
      <MedicalDisclaimer />

      {/* Hero Intro */}
      <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6]">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-[#F8FAFC]">
            RetinaAI System Documentation & Clinical Engineering Manual
          </h2>
        </div>
        <p className="text-xs text-[#A7B1C8] leading-relaxed max-w-4xl">
          RetinaAI is an automated medical image diagnostics platform developed for high-throughput screening of
          diabetic retinopathy (DR) from digital retinal fundus photography. This manual documents the clinical disease scale,
          computer vision preprocessing pipeline, CNN architecture, evaluation protocols, and REST API endpoints.
        </p>
      </div>

      {/* Section 1: Clinical Severity Scale Table */}
      <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#22D3EE]" />
          <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wide">
            1. International Clinical Diabetic Retinopathy Disease Severity Scale (APTOS 2019)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2B3550] text-[#A7B1C8] bg-[#0B1020]/40">
                <th className="py-2.5 px-3">Grade</th>
                <th className="py-2.5 px-3">Clinical Name</th>
                <th className="py-2.5 px-3">Pathological Retinal Lesions</th>
                <th className="py-2.5 px-3">International Diagnostic Criteria</th>
                <th className="py-2.5 px-3">Screening Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B3550]/40">
              <tr className="hover:bg-[#202944]/40">
                <td className="py-3 px-3 font-bold font-mono text-[#34D399]">0</td>
                <td className="py-3 px-3 font-semibold text-[#F8FAFC]">No DR</td>
                <td className="py-3 px-3 text-[#A7B1C8]">None visible</td>
                <td className="py-3 px-3 text-[#A7B1C8]">No microaneurysms, hemorrhages, or exudates</td>
                <td className="py-3 px-3 text-[#34D399]">Annual dilated exam</td>
              </tr>
              <tr className="hover:bg-[#202944]/40">
                <td className="py-3 px-3 font-bold font-mono text-[#38BDF8]">1</td>
                <td className="py-3 px-3 font-semibold text-[#F8FAFC]">Mild NPDR</td>
                <td className="py-3 px-3 text-[#A7B1C8]">Microaneurysms only</td>
                <td className="py-3 px-3 text-[#A7B1C8]">Tiny outpouchings in retinal capillary walls</td>
                <td className="py-3 px-3 text-[#38BDF8]">Follow-up in 9–12 months</td>
              </tr>
              <tr className="hover:bg-[#202944]/40">
                <td className="py-3 px-3 font-bold font-mono text-[#FBBF24]">2</td>
                <td className="py-3 px-3 font-semibold text-[#F8FAFC]">Moderate NPDR</td>
                <td className="py-3 px-3 text-[#A7B1C8]">Hemorrhages, hard exudates, cotton-wool spots</td>
                <td className="py-3 px-3 text-[#A7B1C8]">More than mild microaneurysms but less than Severe</td>
                <td className="py-3 px-3 text-[#FBBF24]">Ophthalmology exam in 3–6 months</td>
              </tr>
              <tr className="hover:bg-[#202944]/40">
                <td className="py-3 px-3 font-bold font-mono text-[#FB923C]">3</td>
                <td className="py-3 px-3 font-semibold text-[#F8FAFC]">Severe NPDR</td>
                <td className="py-3 px-3 text-[#A7B1C8]">Extensive intraretinal blot hemorrhages</td>
                <td className="py-3 px-3 text-[#A7B1C8]">Meets 4-2-1 rule: &gt;20 hemorrhages in 4 quadrants, venous beading</td>
                <td className="py-3 px-3 text-[#FB923C]">Urgent retinal referral (2–4 weeks)</td>
              </tr>
              <tr className="hover:bg-[#202944]/40">
                <td className="py-3 px-3 font-bold font-mono text-[#FB7185]">4</td>
                <td className="py-3 px-3 font-semibold text-[#F8FAFC]">Proliferative DR</td>
                <td className="py-3 px-3 text-[#A7B1C8]">Neovascularization, vitreous hemorrhage</td>
                <td className="py-3 px-3 text-[#A7B1C8]">Fragile abnormal blood vessels on disc/retina with detachment risk</td>
                <td className="py-3 px-3 text-[#FB7185]">Immediate intervention (24–48 hours)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Machine Learning Architecture & Preprocessing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#8B5CF6]" />
            <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wide">
              2. Preprocessing & Artifact Removal
            </h3>
          </div>
          <div className="space-y-2 text-xs text-[#A7B1C8] leading-relaxed">
            <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550]">
              <strong className="text-[#F8FAFC] block mb-1">Circular Contour Cropping:</strong>
              Fundus cameras produce round ocular images bordered by large black rectangles. The algorithm segments the retinal contour and crops bounding margins to eliminate uninformative zero-value pixels.
            </div>
            <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550]">
              <strong className="text-[#F8FAFC] block mb-1">CLAHE in LAB Color Space:</strong>
              Converts RGB to CIELAB space. Contrast Limited Adaptive Histogram Equalization is applied strictly to the L (luminance) channel, enhancing micro-aneurysms while preserving natural retinal pigmentation.
            </div>
            <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550]">
              <strong className="text-[#F8FAFC] block mb-1">Ben Graham Illumination Normalization:</strong>
              Computes Gaussian blur illumination field and applies weighted subtraction to normalize variable photographic exposure across different clinical cameras.
            </div>
          </div>
        </div>

        <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#22D3EE]" />
            <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wide">
              3. Deep Neural Network Architecture
            </h3>
          </div>
          <div className="space-y-2 text-xs text-[#A7B1C8] leading-relaxed">
            <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550]">
              <strong className="text-[#F8FAFC] block mb-1">Custom 4-Stage ConvNet:</strong>
              Input shape (224, 224, 3) followed by four progressive Conv2D blocks (32, 64, 128, 256 filters) with BatchNormalization, ReLU activation, MaxPooling2D, and Spatial Dropout.
            </div>
            <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550]">
              <strong className="text-[#F8FAFC] block mb-1">Latent Representation & Dense Head:</strong>
              GlobalAveragePooling2D aggregates spatial feature maps into a 256-dimensional latent vector, processed through Dense(256) with 50% Dropout for clinical regularization.
            </div>
            <div className="p-3 rounded-lg bg-[#202944] border border-[#2B3550]">
              <strong className="text-[#F8FAFC] block mb-1">Grad-CAM Interpretability:</strong>
              Backpropagates predicted severity score gradients to the penultimate convolutional feature map to highlight discriminative lesion clusters.
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: REST API Specifications */}
      <div className="bg-[#171E35] border border-[#2B3550] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-[#34D399]" />
          <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wide">
            4. REST API Endpoint Specifications
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#2B3550] text-[#A7B1C8]">
                <th className="py-2 px-3">Method</th>
                <th className="py-2 px-3">Endpoint</th>
                <th className="py-2 px-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B3550]/40 text-[11px]">
              <tr>
                <td className="py-2 px-3 text-[#34D399] font-bold">GET</td>
                <td className="py-2 px-3 text-[#22D3EE]">/api/health</td>
                <td className="py-2 px-3 text-[#A7B1C8]">System health status & model availability check</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#34D399] font-bold">GET</td>
                <td className="py-2 px-3 text-[#22D3EE]">/api/dashboard</td>
                <td className="py-2 px-3 text-[#A7B1C8]">Aggregated dashboard KPIs, curves, and recent history</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#8B5CF6] font-bold">POST</td>
                <td className="py-2 px-3 text-[#22D3EE]">/api/predict</td>
                <td className="py-2 px-3 text-[#A7B1C8]">Uploads image, runs CNN inference, Grad-CAM, & logs to SQLite</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#8B5CF6] font-bold">POST</td>
                <td className="py-2 px-3 text-[#22D3EE]">/api/preprocess</td>
                <td className="py-2 px-3 text-[#A7B1C8]">Step-by-step visual inspection of preprocessing stages</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#34D399] font-bold">GET</td>
                <td className="py-2 px-3 text-[#22D3EE]">/api/dataset/stats</td>
                <td className="py-2 px-3 text-[#A7B1C8]">Returns verified dataset counts, splits, and imbalance report</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#8B5CF6] font-bold">POST</td>
                <td className="py-2 px-3 text-[#22D3EE]">/api/train</td>
                <td className="py-2 px-3 text-[#A7B1C8]">Launches non-blocking background TensorFlow training worker</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#34D399] font-bold">GET</td>
                <td className="py-2 px-3 text-[#22D3EE]">/api/train/status</td>
                <td className="py-2 px-3 text-[#A7B1C8]">Live training progress telemetry, loss/accuracy, & log stream</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#34D399] font-bold">GET</td>
                <td className="py-2 px-3 text-[#22D3EE]">/api/evaluation</td>
                <td className="py-2 px-3 text-[#A7B1C8]">Held-out test set accuracy, F1, and 5x5 confusion matrix</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#34D399] font-bold">GET</td>
                <td className="py-2 px-3 text-[#22D3EE]">/api/history</td>
                <td className="py-2 px-3 text-[#A7B1C8]">Paginated inference history with search and class filtering</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#34D399] font-bold">GET</td>
                <td className="py-2 px-3 text-[#22D3EE]">/api/report/:id</td>
                <td className="py-2 px-3 text-[#A7B1C8]">Generates printable clinical-style analytical PDF report</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

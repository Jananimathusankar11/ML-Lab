"""
RetinaAI - Prediction History and Clinical Reports API Routes
Endpoints:
- GET /api/history
- GET /api/history/<id>
- DELETE /api/history/<id>
- GET /api/report/<id>
"""

from flask import Blueprint, request, jsonify, make_response
from database import get_predictions, get_prediction_by_id, delete_prediction
from config import MEDICAL_DISCLAIMER, CLASS_DETAILS

history_bp = Blueprint("history", __name__)

@history_bp.route("/history", methods=["GET"])
def list_history():
    """
    GET /api/history
    Query params:
    - limit: int (default 20)
    - offset: int (default 0)
    - search: string
    - class: int
    """
    limit = int(request.args.get("limit", 20))
    offset = int(request.args.get("offset", 0))
    search = request.args.get("search", "").strip()
    class_filter = request.args.get("class", None)

    if class_filter is not None and class_filter != "":
        try:
            class_filter = int(class_filter)
        except ValueError:
            class_filter = None
    else:
        class_filter = None

    data = get_predictions(limit=limit, offset=offset, search=search, class_filter=class_filter)
    return jsonify({
        "success": True,
        "data": data
    })

@history_bp.route("/history/<pred_id>", methods=["GET"])
def get_single_prediction(pred_id: str):
    """GET /api/history/<id>: Retrieve single prediction record."""
    pred = get_prediction_by_id(pred_id)
    if not pred:
        return jsonify({"success": False, "error": "Prediction record not found"}), 404

    # Attach clinical details
    class_info = CLASS_DETAILS.get(pred["predicted_class"], {})
    pred["clinical_details"] = class_info

    return jsonify({
        "success": True,
        "data": pred
    })

@history_bp.route("/history/<pred_id>", methods=["DELETE"])
def remove_prediction(pred_id: str):
    """DELETE /api/history/<id>: Delete prediction record."""
    deleted = delete_prediction(pred_id)
    if not deleted:
        return jsonify({"success": False, "error": "Prediction record not found or already deleted"}), 404
    return jsonify({
        "success": True,
        "message": f"Prediction {pred_id} deleted successfully"
    })

@history_bp.route("/report/<pred_id>", methods=["GET"])
def generate_report(pred_id: str):
    """
    GET /api/report/<id>
    Generates a printable clinical-style analytical report (JSON format or HTML printable summary).
    """
    pred = get_prediction_by_id(pred_id)
    if not pred:
        return jsonify({"success": False, "error": "Prediction not found"}), 404

    class_idx = pred["predicted_class"]
    class_info = CLASS_DETAILS[class_idx]

    report = {
        "report_id": f"REP-{pred['id']}",
        "generated_at": pred["timestamp"],
        "patient_image_id": pred["filename"],
        "model_version": pred.get("model_version", "CNN-v1"),
        "findings": {
            "severity_grade": class_idx,
            "clinical_diagnosis": pred["class_name"],
            "diagnostic_confidence": f"{round(pred['confidence'] * 100, 2)}%",
            "clinical_urgency": class_info["urgency"],
            "characteristic_lesions": class_info["lesions"],
            "recommended_action": class_info["clinical_action"]
        },
        "probabilities": pred["probabilities"],
        "processing_time_ms": pred["processing_time_ms"],
        "medical_disclaimer": MEDICAL_DISCLAIMER
    }

    # If requested as HTML view for direct printing / PDF save
    format_type = request.args.get("format", "json")
    if format_type == "html":
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>RetinaAI Clinical Analysis Report - {pred['id']}</title>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0B1020; color: #F8FAFC; margin: 40px; }}
                .report-card {{ background: #171E35; border: 1px solid #2B3550; border-radius: 12px; padding: 32px; max-width: 800px; margin: auto; }}
                .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8B5CF6; padding-bottom: 16px; margin-bottom: 24px; }}
                .brand {{ font-size: 24px; font-weight: bold; color: #8B5CF6; }}
                .badge {{ background: {class_info['color']}; color: #000; font-weight: bold; padding: 6px 16px; border-radius: 20px; }}
                .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }}
                .item {{ background: #202944; padding: 14px; border-radius: 8px; border: 1px solid #2B3550; }}
                .label {{ font-size: 12px; color: #A7B1C8; text-transform: uppercase; margin-bottom: 4px; }}
                .value {{ font-size: 16px; font-weight: 600; color: #F8FAFC; }}
                .disclaimer {{ background: #231B32; border-left: 4px solid #FBBF24; padding: 16px; margin-top: 24px; font-size: 12px; color: #A7B1C8; }}
            </style>
        </head>
        <body>
            <div class="report-card">
                <div class="header">
                    <div>
                        <div class="brand">RetinaAI — Analysis Report</div>
                        <div style="font-size: 13px; color: #A7B1C8; margin-top: 4px;">ID: {pred['id']} | Timestamp: {pred['timestamp']}</div>
                    </div>
                    <div class="badge">Grade {class_idx}: {pred['class_name']}</div>
                </div>
                <div class="grid">
                    <div class="item"><div class="label">Image Filename</div><div class="value">{pred['filename']}</div></div>
                    <div class="item"><div class="label">Confidence Score</div><div class="value">{round(pred['confidence'] * 100, 2)}%</div></div>
                    <div class="item"><div class="label">Clinical Urgency</div><div class="value">{class_info['urgency']}</div></div>
                    <div class="item"><div class="label">Model Architecture</div><div class="value">{pred.get('model_version', 'Custom CNN')}</div></div>
                </div>
                <div class="item" style="margin-bottom: 16px;">
                    <div class="label">Expected Pathological Lesions</div>
                    <div class="value" style="font-weight: 400; font-size: 14px;">{class_info['lesions']}</div>
                </div>
                <div class="item">
                    <div class="label">Recommended Clinical Protocol</div>
                    <div class="value" style="font-weight: 400; font-size: 14px;">{class_info['clinical_action']}</div>
                </div>
                <div class="disclaimer">
                    <strong>Medical Disclaimer:</strong> {MEDICAL_DISCLAIMER}
                </div>
            </div>
            <script>window.onload = function() {{ window.print(); }}</script>
        </body>
        </html>
        """
        response = make_response(html_content)
        response.headers["Content-Type"] = "text/html"
        return response

    return jsonify({"success": True, "data": report})

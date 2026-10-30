# src/intervia/domains/stage_e_reporting/doc_exporter.py
from pathlib import Path
import jinja2
from weasyprint import HTML

class DocumentExporterService:
    """Compiles markdown/structured report data into professional PDF documents using Weasyprint & Jinja2."""

    @staticmethod
    def render_report_pdf(report_data: dict, output_filepath: str) -> str:
        # Note: Adjusted template_dir to point to your current directory if needed
        template_dir = Path(__file__).parent.parent.parent / "infrastructure" / "nebius" / "prompts"
        env = jinja2.Environment(loader=jinja2.FileSystemLoader(template_dir))
        
        # Fallback HTML layout
        html_template = env.from_string("""
        <html>
            <head>
                <style>
                    body { font-family: sans-serif; padding: 40px; color: #333; }
                    .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
                    .candidate-name { color: #6366f1; font-size: 24px; font-weight: bold; }
                    .score-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Intervia Executive Assessment Report</h1>
                    <p class="candidate-name">Candidate: {{ report.candidate_name }}</p>
                </div>
                
                <div class="score-box">
                    <h3>Composite Score: {{ report.composite_score }}</h3>
                    <p><strong>Recommendation:</strong> {{ report.hiring_recommendation }}</p>
                </div>
                
                <h3>Executive Summary</h3>
                <p>{{ report.transcript_summary }}</p>
                
                <h3>Risk Flags</h3>
                <ul>
                {% for flag in report.risk_flags %}
                    <li style="color: red;">{{ flag }}</li>
                {% endfor %}
                </ul>
            </body>
        </html>
        """)

        rendered_html = html_template.render(report=report_data)
        HTML(string=rendered_html).write_pdf(output_filepath)
        return output_filepath
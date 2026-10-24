from pathlib import Path
import jinja2
from weasyprint import HTML

class DocumentExporterService:
    """Compiles markdown/structured report data into professional PDF documents using Weasyprint & Jinja2."""

    @staticmethod
    def render_report_pdf(report_data: dict, output_filepath: str) -> str:
        template_dir = Path(__file__).parent.parent.parent / "infrastructure" / "nebius" / "prompts"
        env = jinja2.Environment(loader=jinja2.FileSystemLoader(template_dir))
        
        # Fallback HTML layout if custom HTML template is absent
        html_template = env.from_string("""
        <html>
                                        
            <head><style>body { font-family: sans-serif; padding: 30px; }</style></head>
            <body>
                <h1>Intervia Candidate Assessment Report</h1>
                <hr>
                <h3>Composite Score: {{ report.composite_score }}</h3>
                <p><strong>Recommendation:</strong> {{ report.hiring_recommendation }}</p>
                <h3>Executive Summary</h3>
                <p>{{ report.transcript_summary }}</p>
                <h3>Risk Flags</h3>
                <ul>
                {% for flag in report.risk_flags %}
                    <li>{{ flag }}</li>
                {% endfor %}
                </ul>
            </body>
        </html>
        """)

        rendered_html = html_template.render(report=report_data)
        HTML(string=rendered_html).write_pdf(output_filepath)
        return output_filepath
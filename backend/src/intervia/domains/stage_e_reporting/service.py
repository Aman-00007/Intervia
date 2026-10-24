from intervia.domains.stage_e_reporting.repository import ReportingRepository
from intervia.domains.stage_e_reporting.doc_exporter import DocumentExporterService
from intervia.infrastructure.privacy.leak_scanner import ZeroPIILeakScanner

class ReportingService:
    def __init__(self, repo: ReportingRepository):
        self.repo = repo

    async def generate_and_export_report(self, session_id: str, candidate_id: str, raw_data: dict) -> str:
        # 1. Ensure AI output has no PII
        ZeroPIILeakScanner.assert_no_pii(raw_data.get("transcript_summary", ""))
        
        # 2. Save to DB
        await self.repo.save_student_report(session_id, candidate_id, raw_data)
        await self.repo.save_executive_report(session_id, raw_data)
        
        # 3. Export to PDF
        pdf_path = f"/tmp/report_{session_id}.pdf"
        DocumentExporterService.render_report_pdf(raw_data, pdf_path)
        return pdf_path
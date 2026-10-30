# src/intervia/domains/stage_e_reporting/service.py
import asyncio
import os
import tempfile
from intervia.domains.stage_e_reporting.repository import ReportingRepository
from intervia.domains.stage_e_reporting.doc_exporter import DocumentExporterService
from intervia.infrastructure.privacy.leak_scanner import ZeroPIILeakScanner

class ReportingService:
    def __init__(self, repo: ReportingRepository):
        self.repo = repo

    @staticmethod
    def get_pdf_path(session_id: str) -> str:
        """Returns cross-platform safe temp file path for the report PDF."""
        return os.path.join(tempfile.gettempdir(), f"report_{session_id}.pdf")

    async def generate_and_export_report(self, session_id: str, candidate_id: str, raw_data: dict) -> str:
        # 1. Ensure AI output has no PII (Safety Check)
        ZeroPIILeakScanner.assert_no_pii(raw_data.get("transcript_summary", ""))
        
        # 2. Save to Database (AI text remains anonymous here)
        await self.repo.save_student_report(session_id, candidate_id, raw_data)
        await self.repo.save_executive_report(session_id, raw_data)
        
        # 3. Fetch the REAL NAME from identity_vault (Cross-Schema Join)
        candidate_real_name = await self.repo.get_candidate_identity(session_id)
        if not candidate_real_name:
            candidate_real_name = "Candidate"
        
        # 4. Export to PDF (Injecting the real name ONLY at the final step)
        pdf_path = self.get_pdf_path(session_id)
        
        pdf_render_data = {
            **raw_data,
            "candidate_name": candidate_real_name
        }
        
        # Synchronous PDF generation offloaded to thread pool
        await asyncio.to_thread(
            DocumentExporterService.render_report_pdf, 
            pdf_render_data, 
            pdf_path
        )
        
        return pdf_path

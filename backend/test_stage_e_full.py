from pydantic import ValidationError
from intervia.domains.stage_e_reporting.schemas import LoopholesProsperitySchema
from intervia.infrastructure.privacy.leak_scanner import ZeroPIILeakScanner
from intervia.domains.stage_e_reporting.doc_exporter import DocumentExporterService

def run_tests():
    print("🚀 Starting Stage E Module Tests...\n")

    # 1. Test Pydantic Schemas
    print("1️⃣ Testing LoopholesProsperitySchema...")
    try:
        data = LoopholesProsperitySchema(
            loopholes_detected=["Unsanitized SQL input in login", "Missing rate limiter"],
            prosperity_score=8.5,
            suggested_refactors=["Use SQLAlchemy parameterized queries", "Add Redis rate limiting"]
        )
        print("✅ Schema validation successful!")
    except ValidationError as e:
        print(f"❌ Schema validation failed:\n{e}")

    # 2. Test Privacy Gates (Leak Scanner)
    print("\n2️⃣ Testing Zero-PII Leak Scanner...")
    clean_text = "The candidate demonstrated strong system design skills."
    leaky_text = "Contact the candidate at devangee@example.com."
    
    try:
        ZeroPIILeakScanner.assert_no_pii(clean_text)
        print("✅ Clean text passed!")
    except Exception:
        print("❌ Failed: Clean text was blocked!")
        
    try:
        ZeroPIILeakScanner.assert_no_pii(leaky_text)
        print("❌ Failed: Leaky text was NOT blocked!")
    except Exception as e:
        print("✅ PII successfully caught and blocked!")

    # 3. Test PDF Generation (WeasyPrint & Jinja2)
    print("\n3️⃣ Testing Document Exporter...")
    dummy_report = {
        "composite_score": "9.2/10",
        "hiring_recommendation": "Strong Hire",
        "transcript_summary": "Candidate exhibited exceptional depth in database sharding.",
        "risk_flags": ["None identified"]
    }
    try:
        pdf_path = DocumentExporterService.render_report_pdf(dummy_report, "test_report.pdf")
        print(f"✅ PDF successfully generated at: {pdf_path}")
    except Exception as e:
        print(f"❌ PDF generation failed: {e}")

if __name__ == "__main__":
    run_tests()
from presidio_analyzer import AnalyzerEngine, RecognizerRegistry, PatternRecognizer, Pattern
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

class PrivacyEngine:
    def __init__(self) -> None:
        # 1. Define custom Regex Patterns to bypass ML/spaCy requirements
        indian_phone_pattern = Pattern(
            name="indian_phone", 
            regex=r"(?:\+91|91)?[-\s]?[6-9]\d{9}", 
            score=0.85
        )
        roll_number_pattern = Pattern(
            name="roll_number", 
            regex=r"\b[A-Z0-9]{8,15}\b", # Captures typical alphanumeric university roll numbers
            score=0.6
        )
        github_pattern = Pattern(
            name="github_handle", 
            regex=r"github\.com\/([a-zA-Z0-9-]+)", 
            score=0.9
        )

        # 2. Create Recognizers
        phone_recognizer = PatternRecognizer(supported_entity="IN_PHONE", patterns=[indian_phone_pattern])
        roll_recognizer = PatternRecognizer(supported_entity="ROLL_NUMBER", patterns=[roll_number_pattern])
        github_recognizer = PatternRecognizer(supported_entity="GITHUB_HANDLE", patterns=[github_pattern])

        # 3. Load into Registry without requiring external NLP models
        self.registry = RecognizerRegistry()
        self.registry.load_predefined_recognizers() # Loads standard email/URL regex
        self.registry.add_recognizer(phone_recognizer)
        self.registry.add_recognizer(roll_recognizer)
        self.registry.add_recognizer(github_recognizer)

        self.analyzer = AnalyzerEngine(registry=self.registry)
        self.anonymizer = AnonymizerEngine()

    def scrub_text(self, text: str) -> str:
        """Analyzes and replaces sensitive PII with anonymous tokens."""
        if not text:
            return ""
            
        results = self.analyzer.analyze(
            text=text, 
            entities=["EMAIL_ADDRESS", "IN_PHONE", "ROLL_NUMBER", "GITHUB_HANDLE", "URL"],
            language="en"
        )
        
        # Replace detected entities with their category name (e.g., <IN_PHONE>)
        anonymized_result = self.anonymizer.anonymize(
            text=text,
            analyzer_results=results,
            operators={
                "DEFAULT": OperatorConfig("replace", {"new_value": "<REDACTED>"})
            }
        )
        return anonymized_result.text

pii_shield = PrivacyEngine()
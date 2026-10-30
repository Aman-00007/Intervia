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
            regex=r"\b[A-Z0-9]{8,15}\b", 
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

        # 3. Load into Registry
        self.registry = RecognizerRegistry()
        self.registry.load_predefined_recognizers()
        self.registry.add_recognizer(phone_recognizer)
        self.registry.add_recognizer(roll_recognizer)
        self.registry.add_recognizer(github_recognizer)

        self.analyzer = AnalyzerEngine(registry=self.registry)
        self.anonymizer = AnonymizerEngine()

    def scrub_text(self, text: str) -> str:
        """Analyzes and replaces sensitive PII with anonymous tokens (Legacy method)."""
        if not text:
            return ""
            
        results = self.analyzer.analyze(
            text=text, 
            entities=["EMAIL_ADDRESS", "IN_PHONE", "ROLL_NUMBER", "GITHUB_HANDLE", "URL"],
            language="en"
        )
        
        anonymized_result = self.anonymizer.anonymize(
            text=text,
            analyzer_results=results,
            operators={
                "DEFAULT": OperatorConfig("replace", {"new_value": "<REDACTED>"})
            }
        )
        return anonymized_result.text

    def scrub_text_and_return_map(self, text: str) -> tuple[str, dict]:
        """
        Analyzes PII, replaces it with unique tokens (e.g., [EMAIL_ADDRESS_1]), 
        and returns BOTH the scrubbed text and the mapping dictionary.
        """
        if not text:
            return "", {}

        results = self.analyzer.analyze(
            text=text, 
            entities=["EMAIL_ADDRESS", "IN_PHONE", "ROLL_NUMBER", "GITHUB_HANDLE", "URL"],
            language="en"
        )

        # Sort results in reverse order so replacing them doesn't mess up string indices
        results = sorted(results, key=lambda x: x.start, reverse=True)
        
        pii_map = {}
        scrubbed_text = text

        for i, result in enumerate(results):
            entity_value = text[result.start:result.end]
            # Create a unique token like [IN_PHONE_1], [EMAIL_ADDRESS_1], etc.
            token = f"[{result.entity_type}_{i+1}]"
            
            pii_map[token] = entity_value
            # Replace the real entity with the token
            scrubbed_text = scrubbed_text[:result.start] + token + scrubbed_text[result.end:]

        return scrubbed_text, pii_map

pii_shield = PrivacyEngine()
class RubricEvaluator:
    @staticmethod
    def evaluate_answer(answer_transcript: str, rubric_criteria: list[str]) -> dict:
        """Evaluates a candidate's answer against a strict technical rubric."""
        score = 0
        met_criteria = []
        
        # Simplified evaluation logic
        for criteria in rubric_criteria:
            if criteria.lower() in answer_transcript.lower():
                score += 10
                met_criteria.append(criteria)
                
        return {
            "score": score,
            "max_score": len(rubric_criteria) * 10,
            "met_criteria": met_criteria,
            "passed": score >= (len(rubric_criteria) * 5) # 50% pass rate
        }
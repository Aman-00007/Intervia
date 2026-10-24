from enum import Enum

class InterviewState(Enum):
    INTRODUCTION = "introduction"
    TECHNICAL_Q1 = "technical_q1"
    FOLLOW_UP = "follow_up"
    SYSTEM_DESIGN = "system_design"
    CONCLUSION = "conclusion"

class InterviewStateMachine:
    def __init__(self):
        self.current_state = InterviewState.INTRODUCTION

    def advance_state(self, candidate_passed_section: bool):
        """Moves the interview to the next phase based on candidate performance."""
        if self.current_state == InterviewState.INTRODUCTION:
            self.current_state = InterviewState.TECHNICAL_Q1
        elif self.current_state == InterviewState.TECHNICAL_Q1:
            if not candidate_passed_section:
                self.current_state = InterviewState.FOLLOW_UP
            else:
                self.current_state = InterviewState.SYSTEM_DESIGN
        return self.current_state
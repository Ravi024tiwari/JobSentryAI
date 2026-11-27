from langgraph.graph import StateGraph, START, END
from src.graph.state import InvestigationState
from src.graph.nodes import (
    company_research_node,
    job_cross_check_node,
    llm_reasoning_node
)

 ## this is the workflow of that nodes btw their communication

def create_investigation_graph():
    """
    Builds the detective investigation DAG:
    START -> Company Research -> Job Cross-Check -> LLM Contextual Reasoning -> END
    """
    builder = StateGraph(InvestigationState) ## InvestigationState is the state of the graph

    # Add Nodes
    builder.add_node("company_research", company_research_node)
    builder.add_node("job_cross_check", job_cross_check_node)
    builder.add_node("llm_reasoning", llm_reasoning_node)

    # Add Edges
    builder.add_edge(START, "company_research")
    builder.add_edge("company_research", "job_cross_check")
    builder.add_edge("job_cross_check", "llm_reasoning")
    builder.add_edge("llm_reasoning", END)

    return builder.compile()

# Pre-compiled singleton graph instance
investigation_graph = create_investigation_graph()

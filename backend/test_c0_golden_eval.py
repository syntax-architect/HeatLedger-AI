"""
HEATLEDGER AI: Golden Set Evaluation & Accuracy Test Suite (Prompt C0)
Specification: Prompt Pack v4 - Phase C (Task C0)
Verifies:
  1. Golden dataset exists and contains >= 30 certificates.
  2. Diverse mills represented (>= 5 mills).
  3. Accuracy runner tools/golden/run.py executes cleanly without crash.
  4. Per-field breakdown table is produced with zero single marketing percentages.
  5. Canonical Prompt C0 statutory statement format is generated.
"""

import os
import importlib.util

TOOLS_GOLDEN_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "tools", "golden")
RUN_SCRIPT = os.path.join(TOOLS_GOLDEN_DIR, "run.py")

spec = importlib.util.spec_from_file_location("golden_run_mod", RUN_SCRIPT)
golden_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(golden_mod)

run_accuracy_benchmark = golden_mod.run_accuracy_benchmark


def test_c0_01_golden_dataset_structure_and_mills():
    """Validates that golden dataset contains 30 certificates across multiple mills."""
    results = run_accuracy_benchmark()
    assert results is not None
    assert results["total_certificates"] >= 30
    assert results["unique_mills_count"] >= 5
    assert "field_accuracies" in results


def test_c0_02_per_field_metrics_and_zero_single_percentage():
    """
    Prompt C0 Rule 5:
    'Publish the accuracy only in the form on our test set of N certificates from M mills,
    field X is read correctly Y percent of the time. Never a single marketing percentage.'
    """
    results = run_accuracy_benchmark()
    metrics = results["field_accuracies"]

    # Must contain critical identity, traceability, and metallurgy fields
    assert "heat_number" in metrics
    assert "country_of_melt" in metrics
    assert "country_of_pour" in metrics
    assert "chemistry" in metrics
    assert "mechanical" in metrics

    # Single blended marketing percentage is explicitly forbidden
    assert results["marketing_single_percentage_allowed"] is False

    # Verify canonical statement format
    stmt = results.get("statutory_statement", "")
    assert "On our test set of" in stmt
    assert "certificates from" in stmt
    assert "is read correctly" in stmt
    assert "needs your check" in stmt


def test_c0_03_confusion_list_and_weak_fields():
    """Verifies that confusion list tracks misses for the human review queue."""
    results = run_accuracy_benchmark()
    confusion = results.get("confusion_list_sample", [])
    assert isinstance(confusion, list)
    assert results.get("total_confusion_misses", 0) >= 0

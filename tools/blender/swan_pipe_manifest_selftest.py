"""Contract tests for swan_pipe's run-bound success receipt."""

import json
import os
import tempfile
from datetime import datetime
from unittest.mock import patch

from swan_pipe_manifest import write_success_receipt


def test_missing_run_id_is_refused():
    with tempfile.TemporaryDirectory() as output_dir:
        with patch.dict(os.environ, {"SWAN_PIPE_RUN_ID": ""}):
            try:
                write_success_receipt(output_dir)
            except SystemExit as error:
                assert "SWAN_PIPE_RUN_ID is required" in str(error)
                return
    raise AssertionError("receipt writer accepted an empty run id")


def test_receipt_binds_run_id_and_utc_completion():
    run_id = "contract-test-run"
    with tempfile.TemporaryDirectory() as output_dir:
        with patch.dict(os.environ, {"SWAN_PIPE_RUN_ID": run_id}):
            path = write_success_receipt(output_dir)
        with open(path, encoding="utf-8") as receipt_file:
            receipt = json.load(receipt_file)
        assert receipt["runId"] == run_id
        assert datetime.fromisoformat(receipt["completedAt"]).utcoffset().total_seconds() == 0


if __name__ == "__main__":
    test_missing_run_id_is_refused()
    print("PASS missing run id is refused")
    test_receipt_binds_run_id_and_utc_completion()
    print("PASS receipt binds run id and UTC completion")
    print("2/2 checks passed")

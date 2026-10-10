import unittest
import os
import csv
import shutil
import subprocess
from datetime import datetime

class TestPhase4Integration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        cls.req_csv = os.path.join(cls.base_dir, 'workspace', 'Requirements', 'requirements.csv')
        cls.trace_csv = os.path.join(cls.base_dir, 'workspace', 'Requirements', 'traceability_matrix.csv')
        
        # Directories
        cls.arch_dir = os.path.join(cls.base_dir, 'workspace', 'Architecture')
        cls.code_dir = os.path.join(cls.base_dir, 'workspace', 'Code')
        cls.unit_test_dir = os.path.join(cls.base_dir, 'workspace', 'Test')
        cls.e2e_test_dir = os.path.join(cls.base_dir, 'workspace', 'Test', 'e2e')
        
        os.makedirs(cls.arch_dir, exist_ok=True)
        os.makedirs(cls.code_dir, exist_ok=True)
        os.makedirs(cls.e2e_test_dir, exist_ok=True)

        # Validator script path
        cls.validator_script = os.path.join(cls.base_dir, 'scripts', 'traceability_validator.py')

        # Backup original CSVs
        if os.path.exists(cls.req_csv):
            shutil.copyfile(cls.req_csv, cls.req_csv + '.bak')
        if os.path.exists(cls.trace_csv):
            shutil.copyfile(cls.trace_csv, cls.trace_csv + '.bak')

        # Create mock physical files
        cls.arch_file = os.path.join(cls.arch_dir, 'req_p4_design.md')
        cls.code_file = os.path.join(cls.code_dir, 'p4_module.py')
        cls.unit_file = os.path.join(cls.unit_test_dir, 'test_p4_module.py')
        cls.e2e_file = os.path.join(cls.e2e_test_dir, 'test_p4_e2e.py')

        for f_path in [cls.arch_file, cls.code_file, cls.unit_file, cls.e2e_file]:
            with open(f_path, 'w') as f:
                f.write("# Mock Content")

        # Create mock CSV rows
        cls._setup_mock_data()

    @classmethod
    def _setup_mock_data(cls):
        new_req = {
            "req_id": "REQ-P4",
            "github_issue_id": 444,
            "title": "Phase 4 Validation",
            "description": "Validation test requirement",
            "acceptance_criteria": "Should validate correctly",
            "priority": "High",
            "status": "Tested",
            "creation_date": datetime.utcnow().isoformat() + "Z",
            "last_modification_date": datetime.utcnow().isoformat() + "Z",
            "comment": "Simulated E2E requirement"
        }
        # Assuming we clear the file to test isolation or append safely
        with open(cls.req_csv, 'a', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=new_req.keys())
            writer.writerow(new_req)

        new_trace = {
            "req_id": "REQ-P4",
            "architecture_doc_ref": "workspace/Architecture/req_p4_design.md",
            "source_code_files": "workspace/Code/p4_module.py",
            "unit_test_files": "workspace/Test/test_p4_module.py",
            "sw_test_case_id": "workspace/Test/e2e/test_p4_e2e.py",
            "verification_status": "Pass"
        }
        with open(cls.trace_csv, 'a', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=new_trace.keys())
            writer.writerow(new_trace)

    @classmethod
    def tearDownClass(cls):
        # Restore original CSVs
        if os.path.exists(cls.req_csv + '.bak'):
            shutil.move(cls.req_csv + '.bak', cls.req_csv)
        if os.path.exists(cls.trace_csv + '.bak'):
            shutil.move(cls.trace_csv + '.bak', cls.trace_csv)

        # Cleanup generated physical files
        for f_path in [cls.arch_file, cls.code_file, cls.unit_file, cls.e2e_file]:
            if os.path.exists(f_path):
                os.remove(f_path)

    def test_sw_test_agent_definition(self):
        agent_path = os.path.join(self.base_dir, 'agents', 'sw_test_agent.md')
        self.assertTrue(os.path.exists(agent_path), "sw_test_agent.md is missing")
        with open(agent_path, 'r') as f:
            content = f.read()
            self.assertIn("acceptance_criteria", content)
            self.assertIn("workspace/Test/e2e/", content)
            self.assertIn("sw_test_case_id", content)
            self.assertIn("github_sync_errors.log", content)

    def test_traceability_validator_success(self):
        # Run validator against the perfectly mocked setup
        result = subprocess.run(['python3', self.validator_script], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, f"Validator failed unexpectedly:\n{result.stderr}")
        self.assertIn("Traceability Validation PASSED", result.stdout)

    def test_traceability_validator_missing_file_failure(self):
        # Corrupt the state by removing the E2E test file
        os.remove(self.e2e_file)
        
        result = subprocess.run(['python3', self.validator_script], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1, "Validator should have failed due to missing file.")
        self.assertIn("SW (E2E) test files missing or invalid path", result.stderr)

        # Restore file for subsequent tests
        with open(self.e2e_file, 'w') as f:
            f.write("# Mock Content")

    def test_traceability_validator_status_failure(self):
        # Corrupt the state by changing status in CSV
        updated_rows = []
        with open(self.trace_csv, 'r') as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            for row in reader:
                if row['req_id'] == 'REQ-P4':
                    row['verification_status'] = 'Fail'
                updated_rows.append(row)
        
        with open(self.trace_csv, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(updated_rows)

        result = subprocess.run(['python3', self.validator_script], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1, "Validator should have failed due to Fail status.")
        self.assertIn("Verification status is not 'Pass'", result.stderr)

        # Restore original status
        for row in updated_rows:
            if row['req_id'] == 'REQ-P4':
                row['verification_status'] = 'Pass'
        with open(self.trace_csv, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(updated_rows)

if __name__ == '__main__':
    unittest.main()

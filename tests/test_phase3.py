import unittest
import os
import json
import csv
import shutil
import subprocess
from datetime import datetime

class TestPhase3Integration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        cls.req_csv = os.path.join(cls.base_dir, 'workspace', 'Requirements', 'requirements.csv')
        cls.trace_csv = os.path.join(cls.base_dir, 'workspace', 'Requirements', 'traceability_matrix.csv')
        cls.code_dir = os.path.join(cls.base_dir, 'workspace', 'Code')
        cls.test_dir = os.path.join(cls.base_dir, 'workspace', 'Test')
        
        # Ensure workspace directories exist
        os.makedirs(cls.code_dir, exist_ok=True)
        os.makedirs(cls.test_dir, exist_ok=True)

        # Schemas
        cls.req_schema_path = os.path.join(cls.base_dir, 'config', 'ProjConfig', 'schemas', 'requirements_schema.json')
        cls.trace_schema_path = os.path.join(cls.base_dir, 'config', 'ProjConfig', 'schemas', 'traceability_schema.json')
        
        with open(cls.req_schema_path, 'r') as f:
            cls.req_schema = json.load(f)
        with open(cls.trace_schema_path, 'r') as f:
            cls.trace_schema = json.load(f)

        # Backup original CSVs
        if os.path.exists(cls.req_csv):
            shutil.copyfile(cls.req_csv, cls.req_csv + '.bak')
        if os.path.exists(cls.trace_csv):
            shutil.copyfile(cls.trace_csv, cls.trace_csv + '.bak')

        # Create mock requirements for testing
        cls._setup_mock_data()

    @classmethod
    def _setup_mock_data(cls):
        new_req = {
            "req_id": "REQ-PHASE3",
            "github_issue_id": 333,
            "title": "Phase 3 Code Module",
            "description": "A simple arithmetic module",
            "acceptance_criteria": "Should add two numbers",
            "priority": "Medium",
            "status": "Designed",
            "creation_date": datetime.utcnow().isoformat() + "Z",
            "last_modification_date": datetime.utcnow().isoformat() + "Z",
            "comment": "Simulated designed requirement"
        }
        with open(cls.req_csv, 'a', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=new_req.keys())
            writer.writerow(new_req)

        new_trace = {
            "req_id": "REQ-PHASE3",
            "architecture_doc_ref": "workspace/Architecture/req_phase3_design.md",
            "source_code_files": "",
            "unit_test_files": "",
            "sw_test_case_id": "",
            "verification_status": ""
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

        # Cleanup generated code/test files
        mock_code_file = os.path.join(cls.code_dir, 'math_module.py')
        mock_test_file = os.path.join(cls.test_dir, 'test_math_module.py')
        if os.path.exists(mock_code_file):
            os.remove(mock_code_file)
        if os.path.exists(mock_test_file):
            os.remove(mock_test_file)

    def test_agent_definitions_exist(self):
        coding_agent_path = os.path.join(self.base_dir, 'agents', 'coding_agent.md')
        unit_test_agent_path = os.path.join(self.base_dir, 'agents', 'unit_test_agent.md')
        
        self.assertTrue(os.path.exists(coding_agent_path), "coding_agent.md is missing")
        self.assertTrue(os.path.exists(unit_test_agent_path), "unit_test_agent.md is missing")
        
        with open(coding_agent_path, 'r') as f:
            content = f.read()
            self.assertIn("github_sync_errors.log", content)
            self.assertIn("workspace/Code/", content)
            self.assertIn("[ERROR]", content)

    def test_coding_agent_simulation(self):
        # 1. Simulate Coding Agent creating the file
        mock_code_file = os.path.join(self.code_dir, 'math_module.py')
        with open(mock_code_file, 'w') as f:
            f.write('"""\n@req_id: REQ-PHASE3\n"""\n\ndef add(a, b):\n    return a + b\n')
        
        self.assertTrue(os.path.exists(mock_code_file))

        # 2. Simulate Traceability Update
        updated_rows = []
        with open(self.trace_csv, 'r') as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            for row in reader:
                if row['req_id'] == 'REQ-PHASE3':
                    row['source_code_files'] = 'workspace/Code/math_module.py'
                updated_rows.append(row)
        
        with open(self.trace_csv, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(updated_rows)

        # 3. Simulate Requirements Update
        updated_reqs = []
        with open(self.req_csv, 'r') as f:
            reader = csv.DictReader(f)
            req_fieldnames = reader.fieldnames
            for row in reader:
                if row['req_id'] == 'REQ-PHASE3':
                    row['status'] = 'Implemented'
                    row['last_modification_date'] = datetime.utcnow().isoformat() + "Z"
                updated_reqs.append(row)
                
        with open(self.req_csv, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=req_fieldnames)
            writer.writeheader()
            writer.writerows(updated_reqs)

        # Verify
        with open(self.req_csv, 'r') as f:
            found = any(row['req_id'] == 'REQ-PHASE3' and row['status'] == 'Implemented' for row in csv.DictReader(f))
            self.assertTrue(found)

    def test_unit_test_agent_simulation(self):
        # Ensure Coding Agent simulation ran first to create math_module
        mock_code_file = os.path.join(self.code_dir, 'math_module.py')
        if not os.path.exists(mock_code_file):
            self.test_coding_agent_simulation()

        # 1. Simulate Unit Test Agent creating the test file
        mock_test_file = os.path.join(self.test_dir, 'test_math_module.py')
        with open(mock_test_file, 'w') as f:
            f.write('import unittest\n')
            f.write('import sys\n')
            f.write('import os\n')
            f.write('sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Code")))\n')
            f.write('import math_module\n\n')
            f.write('class TestMathModule(unittest.TestCase):\n')
            f.write('    def test_add(self):\n')
            f.write('        self.assertEqual(math_module.add(2, 3), 5)\n')
            f.write('\nif __name__ == "__main__":\n')
            f.write('    unittest.main()\n')

        self.assertTrue(os.path.exists(mock_test_file))

        # 2. Simulate Unit Test Agent Executing the Test
        result = subprocess.run(['python3', mock_test_file], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, f"Simulated unit test failed:\n{result.stderr}")

        # 3. Simulate Traceability Update
        updated_rows = []
        with open(self.trace_csv, 'r') as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            for row in reader:
                if row['req_id'] == 'REQ-PHASE3':
                    row['unit_test_files'] = 'workspace/Test/test_math_module.py'
                    row['verification_status'] = 'Pass'
                updated_rows.append(row)
        
        with open(self.trace_csv, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(updated_rows)

        # Verify
        with open(self.trace_csv, 'r') as f:
            found = any(row['req_id'] == 'REQ-PHASE3' and row['verification_status'] == 'Pass' for row in csv.DictReader(f))
            self.assertTrue(found)

if __name__ == '__main__':
    unittest.main()

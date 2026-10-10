import unittest
import os
import json
import csv
import shutil
from datetime import datetime

class TestPhase2Integration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        cls.req_csv = os.path.join(cls.base_dir, 'workspace', 'Requirements', 'requirements.csv')
        cls.trace_csv = os.path.join(cls.base_dir, 'workspace', 'Requirements', 'traceability_matrix.csv')
        
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

    @classmethod
    def tearDownClass(cls):
        # Restore original CSVs
        if os.path.exists(cls.req_csv + '.bak'):
            shutil.move(cls.req_csv + '.bak', cls.req_csv)
        if os.path.exists(cls.trace_csv + '.bak'):
            shutil.move(cls.trace_csv + '.bak', cls.trace_csv)

    def validate_schema(self, instance, schema):
        """Basic robust schema validation mimicking standard JSON schema rules."""
        if "required" in schema:
            for req_field in schema["required"]:
                if req_field not in instance:
                    raise ValueError(f"Missing required field: {req_field}")
        
        for key, val in instance.items():
            if key in schema.get("properties", {}):
                expected_type = schema["properties"][key].get("type")
                if expected_type == "integer" and not isinstance(val, int):
                    if not str(val).isdigit():
                        raise ValueError(f"Field {key} must be an integer, got {val}")

    def test_requirement_agent_csv_integration(self):
        # Simulate Requirement Agent writing a formalized requirement
        new_req = {
            "req_id": "REQ-999",
            "github_issue_id": 999,
            "title": "Mock Login Feature",
            "description": "User should be able to login",
            "acceptance_criteria": "- Field for email\n- Field for password",
            "priority": "High",
            "status": "Pending",
            "creation_date": datetime.utcnow().isoformat() + "Z",
            "last_modification_date": datetime.utcnow().isoformat() + "Z",
            "comment": "Simulated requirement"
        }
        
        # Validate against JSON schema first (simulating agent strictness)
        self.validate_schema(new_req, self.req_schema)

        # Write to CSV
        with open(self.req_csv, 'a', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=new_req.keys())
            writer.writerow(new_req)

        # Verify it was written
        found = False
        with open(self.req_csv, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['req_id'] == 'REQ-999':
                    found = True
                    self.assertEqual(row['title'], "Mock Login Feature")
                    break
        self.assertTrue(found, "Requirement was not successfully persisted to CSV.")

    def test_architect_agent_traceability_integration(self):
        # Simulate Architect Agent reading REQ-999 and writing Traceability
        new_trace = {
            "req_id": "REQ-999",
            "architecture_doc_ref": "workspace/Architecture/req_999_design.md",
            "source_code_files": "",
            "unit_test_files": "",
            "sw_test_case_id": "",
            "verification_status": "Missing"
        }

        # Validate against JSON schema
        self.validate_schema(new_trace, self.trace_schema)

        # Write to Traceability CSV
        with open(self.trace_csv, 'a', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=new_trace.keys())
            writer.writerow(new_trace)

        # Verify it was written
        found = False
        with open(self.trace_csv, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['req_id'] == 'REQ-999':
                    found = True
                    self.assertEqual(row['architecture_doc_ref'], "workspace/Architecture/req_999_design.md")
                    break
        self.assertTrue(found, "Traceability link was not successfully persisted to CSV.")

if __name__ == '__main__':
    unittest.main()

import unittest
import os
import json
import subprocess
import csv

class TestPhase1(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

    def test_mcp_servers_json_exists_and_valid(self):
        mcp_path = os.path.join(self.base_dir, 'config', 'mcp_servers.json')
        self.assertTrue(os.path.exists(mcp_path), "mcp_servers.json does not exist")
        with open(mcp_path, 'r') as f:
            config = json.load(f)
            self.assertIn("mcpServers", config)
            self.assertIn("github", config["mcpServers"])
            self.assertIn("csv", config["mcpServers"])
            self.assertIn("@ishayoyo/excel-mcp", config["mcpServers"]["csv"]["args"])

    def test_env_example_exists(self):
        env_path = os.path.join(self.base_dir, 'config', '.env.example')
        self.assertTrue(os.path.exists(env_path), ".env.example does not exist")

    def test_requirements_schema_exists_and_valid(self):
        schema_path = os.path.join(self.base_dir, 'config', 'ProjConfig', 'schemas', 'requirements_schema.json')
        self.assertTrue(os.path.exists(schema_path), "requirements_schema.json does not exist")
        with open(schema_path, 'r') as f:
            schema = json.load(f)
            self.assertIn("properties", schema)
            props = schema["properties"]
            self.assertIn("req_id", props)
            self.assertIn("creation_date", props)
            self.assertIn("last_modification_date", props)
            self.assertIn("comment", props)

    def test_traceability_schema_exists_and_valid(self):
        schema_path = os.path.join(self.base_dir, 'config', 'ProjConfig', 'schemas', 'traceability_schema.json')
        self.assertTrue(os.path.exists(schema_path), "traceability_schema.json does not exist")
        with open(schema_path, 'r') as f:
            schema = json.load(f)
            self.assertIn("properties", schema)
            self.assertIn("req_id", schema["properties"])

    def test_csv_files_headers(self):
        req_csv_path = os.path.join(self.base_dir, 'workspace', 'Requirements', 'requirements.csv')
        self.assertTrue(os.path.exists(req_csv_path))
        with open(req_csv_path, 'r') as f:
            reader = csv.reader(f)
            headers = next(reader)
            self.assertIn('req_id', headers)
            self.assertIn('creation_date', headers)
            self.assertIn('comment', headers)

        trace_csv_path = os.path.join(self.base_dir, 'workspace', 'Requirements', 'traceability_matrix.csv')
        self.assertTrue(os.path.exists(trace_csv_path))
        with open(trace_csv_path, 'r') as f:
            reader = csv.reader(f)
            headers = next(reader)
            self.assertIn('req_id', headers)
            self.assertIn('verification_status', headers)

    def test_orchestrator_agent_definition(self):
        agent_path = os.path.join(self.base_dir, 'agents', 'orchestrator_agent.md')
        self.assertTrue(os.path.exists(agent_path))
        with open(agent_path, 'r') as f:
            content = f.read()
            self.assertIn("[INFO]", content)
            self.assertIn("Execution Summary", content)

    def test_trigger_script_auto_mode(self):
        trigger_path = os.path.join(self.base_dir, 'triggers', 'run_orchestrator.py')
        self.assertTrue(os.access(trigger_path, os.X_OK), "run_orchestrator.py is not executable")
        
        # We need to temporarily set the token to bypass the missing token error
        env = os.environ.copy()
        env['GITHUB_PERSONAL_ACCESS_TOKEN'] = 'test_token'
        
        result = subprocess.run([trigger_path, '--auto'], env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0)
        self.assertIn("Trigger Mode: AUTO", result.stdout)
        self.assertIn("Status: SUCCESS", result.stdout)

    def test_trigger_script_manual_mode(self):
        trigger_path = os.path.join(self.base_dir, 'triggers', 'run_orchestrator.py')
        
        env = os.environ.copy()
        env['GITHUB_PERSONAL_ACCESS_TOKEN'] = 'test_token'
        
        result = subprocess.run([trigger_path, '--ticket', '42'], env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0)
        self.assertIn("Trigger Mode: MANUAL", result.stdout)
        self.assertIn("ticket #42", result.stdout)
        self.assertIn("Status: SUCCESS", result.stdout)

    def test_trigger_script_missing_token_failure(self):
        trigger_path = os.path.join(self.base_dir, 'triggers', 'run_orchestrator.py')
        
        env = os.environ.copy()
        # Remove token if exists
        if 'GITHUB_PERSONAL_ACCESS_TOKEN' in env:
            del env['GITHUB_PERSONAL_ACCESS_TOKEN']
            
        result = subprocess.run([trigger_path, '--auto'], env=env, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Status: FAILED", result.stdout)
        self.assertIn("Missing GitHub credentials", result.stdout)

if __name__ == '__main__':
    unittest.main()

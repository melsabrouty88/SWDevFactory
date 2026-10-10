import unittest
import os
import sys
import subprocess
import ast

class TestPhase5Dashboard(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        cls.app_path = os.path.join(cls.base_dir, 'dashboard', 'app.py')

    def test_app_file_exists(self):
        self.assertTrue(os.path.exists(self.app_path), "Dashboard app.py is missing.")

    def test_app_syntax_and_imports(self):
        # Ensure the file is valid python syntax
        with open(self.app_path, 'r') as f:
            source = f.read()
        
        try:
            tree = ast.parse(source)
        except SyntaxError as e:
            self.fail(f"Syntax error in app.py: {e}")

        # Check for required imports
        imports = [node.names[0].name for node in ast.walk(tree) if isinstance(node, ast.Import)]
        self.assertIn("streamlit", imports)
        self.assertIn("pandas", imports)
        self.assertIn("subprocess", imports)

    def test_ui_components_exist(self):
        with open(self.app_path, 'r') as f:
            content = f.read()

        # Check for Job Control manual trigger logic
        self.assertIn("triggers', 'run_orchestrator.py'", content)
        self.assertIn("subprocess.run(['python3', trigger_script, '--ticket', ticket_id.strip()]", content)
        
        # Check for Traceability View logic
        self.assertIn("pd.read_csv(req_csv_path)", content)
        self.assertIn("pd.merge(df_req, df_trace", content)
        self.assertIn("scripts', 'traceability_validator.py'", content)
        
        # Check for Logs logic
        self.assertIn("logs', 'github_sync_errors.log'", content)

    def test_requirements_txt(self):
        req_path = os.path.join(self.base_dir, 'dashboard', 'requirements.txt')
        self.assertTrue(os.path.exists(req_path))
        with open(req_path, 'r') as f:
            content = f.read()
            self.assertIn("streamlit", content)
            self.assertIn("pandas", content)

if __name__ == '__main__':
    unittest.main()

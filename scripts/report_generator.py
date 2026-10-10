#!/usr/bin/env python3
import os
import sys
import csv
import json
from datetime import datetime

def load_settings(base_dir):
    settings_path = os.path.join(base_dir, 'config', 'ProjConfig', 'settings.json')
    with open(settings_path, 'r') as f:
        return json.load(f)

def generate_markdown_report(reqs, traces, output_path):
    with open(output_path, 'w') as f:
        f.write("# Project Traceability Report\n\n")
        f.write(f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC\n\n")
        
        # Summary Metrics
        total_reqs = len(reqs)
        implemented = sum(1 for r in reqs.values() if r.get('status') in ['Implemented', 'Tested'])
        verified = sum(1 for t in traces.values() if t.get('verification_status') == 'Pass')
        
        f.write("## Executive Summary\n")
        f.write(f"- **Total Requirements:** {total_reqs}\n")
        f.write(f"- **Implemented Code:** {implemented}\n")
        f.write(f"- **Fully Verified (Passed):** {verified}\n\n")
        
        # Detail Matrix
        f.write("## Traceability Matrix\n\n")
        f.write("| Requirement ID | Title | Status | Architecture | Code Files | Unit Tests | E2E Tests | Verification |\n")
        f.write("| --- | --- | --- | --- | --- | --- | --- | --- |\n")
        
        for req_id, req in reqs.items():
            trace = traces.get(req_id, {})
            title = req.get('title', 'N/A')
            status = req.get('status', 'Unknown')
            arch = trace.get('architecture_doc_ref', '❌') or '❌'
            code = trace.get('source_code_files', '❌') or '❌'
            unit = trace.get('unit_test_files', '❌') or '❌'
            e2e = trace.get('sw_test_case_id', '❌') or '❌'
            verif = trace.get('verification_status', '❌') or '❌'
            
            # Format nicely
            verif_emoji = "🟢 Pass" if verif == "Pass" else ("🔴 Fail" if verif == "Fail" else "⏳ Pending")
            
            f.write(f"| `{req_id}` | {title} | {status} | `{arch}` | `{code}` | `{unit}` | `{e2e}` | {verif_emoji} |\n")

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    settings = load_settings(base_dir)
    
    req_csv_path = os.path.join(base_dir, settings['paths']['requirements_csv'])
    trace_csv_path = os.path.join(base_dir, settings['paths']['traceability_csv'])
    report_output_path = os.path.join(base_dir, 'workspace', 'Traceability_Report.md')
    
    reqs = {}
    if os.path.exists(req_csv_path):
        with open(req_csv_path, 'r') as f:
            for row in csv.DictReader(f):
                reqs[row['req_id']] = row

    traces = {}
    if os.path.exists(trace_csv_path):
        with open(trace_csv_path, 'r') as f:
            for row in csv.DictReader(f):
                traces[row['req_id']] = row

    generate_markdown_report(reqs, traces, report_output_path)
    print(f"Report successfully generated at: {report_output_path}")

if __name__ == "__main__":
    main()

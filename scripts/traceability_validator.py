#!/usr/bin/env python3
import os
import sys
import csv
import json

def load_settings(base_dir):
    settings_path = os.path.join(base_dir, 'config', 'ProjConfig', 'settings.json')
    if not os.path.exists(settings_path):
        print(f"Error: settings.json not found at {settings_path}", file=sys.stderr)
        sys.exit(1)
    with open(settings_path, 'r') as f:
        return json.load(f)

def validate_file_exists(base_dir, file_path_str):
    if not file_path_str:
        return False
    # Handle comma-separated paths
    paths = [p.strip() for p in file_path_str.split(',')]
    for p in paths:
        if not p:
            continue
        full_path = os.path.join(base_dir, p)
        if not os.path.exists(full_path):
            return False
    return True

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    settings = load_settings(base_dir)
    
    req_csv_path = os.path.join(base_dir, settings['paths']['requirements_csv'])
    trace_csv_path = os.path.join(base_dir, settings['paths']['traceability_csv'])
    
    if not os.path.exists(req_csv_path) or not os.path.exists(trace_csv_path):
        print("Error: CSV data stores not found.", file=sys.stderr)
        sys.exit(1)

    # 1. Load Requirements
    reqs = {}
    with open(req_csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            reqs[row['req_id']] = row

    # 2. Load Traceability
    traces = {}
    with open(trace_csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            traces[row['req_id']] = row

    errors = []

    # Apply Validation Rules
    for req_id, req_data in reqs.items():
        # Rule 1: Requirement Coverage
        if req_id not in traces:
            errors.append(f"[{req_id}] Missing from traceability_matrix.csv")
            continue
        
        trace = traces[req_id]

        # Rule 2: Architecture Coverage
        if not trace.get('architecture_doc_ref') or not validate_file_exists(base_dir, trace.get('architecture_doc_ref')):
            errors.append(f"[{req_id}] Architecture document missing or invalid path: '{trace.get('architecture_doc_ref')}'")

        # Rule 3: Code Coverage
        if not trace.get('source_code_files') or not validate_file_exists(base_dir, trace.get('source_code_files')):
            errors.append(f"[{req_id}] Source code files missing or invalid path: '{trace.get('source_code_files')}'")

        # Rule 4: Test Coverage
        if not trace.get('unit_test_files') or not validate_file_exists(base_dir, trace.get('unit_test_files')):
            errors.append(f"[{req_id}] Unit test files missing or invalid path: '{trace.get('unit_test_files')}'")
            
        if not trace.get('sw_test_case_id') or not validate_file_exists(base_dir, trace.get('sw_test_case_id')):
            errors.append(f"[{req_id}] SW (E2E) test files missing or invalid path: '{trace.get('sw_test_case_id')}'")

        # Rule 5: Status Verification
        if trace.get('verification_status') != "Pass":
            errors.append(f"[{req_id}] Verification status is not 'Pass' (Current: '{trace.get('verification_status')}')")

    if errors:
        print("=== Traceability Validation FAILED ===", file=sys.stderr)
        for err in errors:
            print(f"- {err}", file=sys.stderr)
        sys.exit(1)

    print("=== Traceability Validation PASSED ===")
    print(f"All {len(reqs)} requirements are fully mapped, implemented, and tested.")
    sys.exit(0)

if __name__ == "__main__":
    main()

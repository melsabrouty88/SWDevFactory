import streamlit as st
import os
import json
import subprocess
import pandas as pd

# Setup page configuration
st.set_page_config(
    page_title="Multi-Agent Software Factory",
    page_icon="🤖",
    layout="wide"
)

# Utility: Load global paths from settings.json
@st.cache_data
def load_settings():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    settings_path = os.path.join(base_dir, 'config', 'ProjConfig', 'settings.json')
    try:
        with open(settings_path, 'r') as f:
            settings = json.load(f)
            # Add base_dir to settings for absolute path resolution later
            settings['base_dir'] = base_dir
            return settings
    except Exception as e:
        st.error(f"Failed to load settings.json: {e}")
        return None

settings = load_settings()

st.title("🏭 Multi-Agent Software Factory Dashboard")
st.markdown("Welcome to the control plane for your autonomous software factory. Navigate using the tabs below to monitor agents, trigger workflows, and view bidirectional traceability.")

if not settings:
    st.stop()

# Define core views using Streamlit Tabs
# tab_home, tab_job_control, tab_traceability, tab_analytics, tab_logs = st.tabs([
tab_home, tab_job_control, tab_traceability, tab_analytics = st.tabs([
    "🏠 Home", 
    "⚙️ Job Control", 
    "🔗 Traceability Matrix", 
    "💰 Token Analytics"
    # "📋 System Logs"
])

with tab_home:
    st.header("Factory Overview")
    st.info("The factory is currently online. Use the Job Control tab to trigger the Orchestrator, or view the Traceability Matrix to inspect output.")
    
    # Live Active Run Tracking
    active_run_path = os.path.join(settings['base_dir'], 'logs', 'active_run.json')
    should_auto_refresh = False
    
    if os.path.exists(active_run_path):
        try:
            with open(active_run_path, 'r') as f:
                active_run = json.load(f)
            if active_run.get('status') == 'running':
                st.subheader("🏃‍♂️ Live Execution Tracking")
                st.write(f"**Target:** Ticket #{active_run.get('ticket')}")
                st.write(f"**Active Subagent:** {active_run.get('current_agent')}")
                st.progress(active_run.get('progress', 0) / 100.0)
                st.code(active_run.get('message'))
                # Auto-refresh mechanism deferred to the end of the script
                should_auto_refresh = True
            else:
                st.success("All pipelines are currently idle. System is ready for the next job.")
        except Exception as e:
            pass
    else:
        st.success("All pipelines are currently idle. System is ready for the next job.")
    
    st.markdown("---")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric(label="Configured Subagents", value="5")
    with col2:
        st.metric(label="Pending Tickets", value="--")
    with col3:
        st.metric(label="Traceability Health", value="--")

with tab_job_control:
    st.header("⚙️ Job Control")
    st.markdown("Manually trigger the factory for a specific ticket or configure the auto-triage scheduler.")
    
    col_manual, col_auto = st.columns(2)
    
    with col_manual:
        st.subheader("Manual Trigger")
        
        # Display persisted manual trigger message so it isn't lost on refresh
        if 'manual_trigger_msg' in st.session_state:
            st.success(st.session_state['manual_trigger_msg'])
            
        ticket_id = st.text_input("GitHub Issue ID", placeholder="e.g., 123")
        
        if st.button("🚀 Run Factory on Ticket"):
            if ticket_id.strip():
                trigger_script = os.path.join(settings['base_dir'], 'triggers', 'run_orchestrator.py')
                try:
                    # Pre-emptively write the active_run.json to avoid a race condition
                    active_run_path = os.path.join(settings['base_dir'], 'logs', 'active_run.json')
                    os.makedirs(os.path.dirname(active_run_path), exist_ok=True)
                    with open(active_run_path, 'w') as f:
                        json.dump({
                            "status": "running",
                            "ticket": ticket_id.strip(),
                            "current_agent": "Orchestrator Booting",
                            "progress": 5,
                            "message": "Initializing pipeline..."
                        }, f)

                    # Run in background so Streamlit can render live updates
                    log_file_path = os.path.join(settings['base_dir'], 'logs', 'last_run.log')
                    with open(log_file_path, 'w') as f:
                        subprocess.Popen(
                            ['python3', trigger_script, '--ticket', ticket_id.strip()],
                            stdout=f, stderr=subprocess.STDOUT
                        )
                    st.session_state['manual_trigger_msg'] = f"Factory triggered for ticket #{ticket_id}! Switch to the Home tab to see Live Tracking."
                    
                    # Force an immediate rerun to kick off the Home tab's auto-refresh loop
                    st.rerun()       
                except Exception as e:
                    st.error(f"Execution failed: {str(e)}")
            else:
                st.warning("Please enter a valid Ticket ID.")
                

    with col_auto:
        st.subheader("Auto-Triage Scheduler")
        schedule_interval = st.selectbox("Run frequency", ["Every 1 hour", "Every 4 hours", "Daily at midnight"])
        if st.button("💾 Save Schedule"):
            st.success(f"Schedule '{schedule_interval}' saved successfully! (Mocked)")
            st.info("The Orchestrator will automatically pull the highest priority open ticket on this schedule.")

with tab_traceability:
    st.header("🔗 Bidirectional Traceability Matrix")
    st.markdown("Live view of the requirements and their traceability through architecture, code, and testing.")
    
    req_csv_path = os.path.join(settings['base_dir'], settings['paths']['requirements_csv'])
    trace_csv_path = os.path.join(settings['base_dir'], settings['paths']['traceability_csv'])
    
    try:
        if os.path.exists(req_csv_path) and os.path.exists(trace_csv_path):
            df_req = pd.read_csv(req_csv_path)
            df_trace = pd.read_csv(trace_csv_path)
            
            # Merge for a comprehensive view
            df_merged = pd.merge(df_req, df_trace, on="req_id", how="left")
            
            # Display interactive dataframe
            st.dataframe(
                df_merged[['req_id', 'title', 'status', 'architecture_doc_ref', 'source_code_files', 'verification_status']], 
                use_container_width=True
            )
            
            # Traceability Engine Validator Trigger
            st.subheader("Traceability Engine Validator")
            st.markdown("Run the strict validation script to mathematically prove all references exist on disk.")
            if st.button("🔍 Run Traceability Validator"):
                val_script = os.path.join(settings['base_dir'], 'scripts', 'traceability_validator.py')
                val_result = subprocess.run(['python3', val_script], capture_output=True, text=True)
                if val_result.returncode == 0:
                    st.success("Traceability Matrix is 100% Valid!")
                else:
                    st.error("Traceability Matrix Validation Failed.")
                    st.code(val_result.stderr)
        else:
            st.warning("CSV Data stores not found. Run the factory to generate data.")
    except Exception as e:
        st.error(f"Error loading CSV data: {str(e)}")

with tab_analytics:
    st.header("💰 Token & Cost Analytics")
    st.markdown("Track the LLM token consumption and estimated costs across all subagents.")
    
    token_log_path = os.path.join(settings['base_dir'], 'logs', 'token_usage.csv')
    
    if os.path.exists(token_log_path):
        try:
            df_tokens = pd.read_csv(token_log_path)
            
            # Calculate totals
            total_prompt = df_tokens['prompt_tokens'].sum()
            total_completion = df_tokens['completion_tokens'].sum()
            total_cost = df_tokens['estimated_cost'].sum()
            
            col1, col2, col3 = st.columns(3)
            col1.metric("Total Prompt Tokens", f"{total_prompt:,}")
            col2.metric("Total Completion Tokens", f"{total_completion:,}")
            col3.metric("Total Estimated Cost", f"${total_cost:,.4f}")
            
            st.subheader("Consumption per Subagent")
            
            # Group by subagent
            df_grouped = df_tokens.groupby('subagent_name').agg({
                'prompt_tokens': 'sum',
                'completion_tokens': 'sum',
                'estimated_cost': 'sum'
            }).reset_index()
            
            # Render a bar chart for cost visualization
            st.bar_chart(data=df_grouped, x='subagent_name', y='estimated_cost')
            
            st.dataframe(df_grouped, use_container_width=True)
            
            st.subheader("Raw Token Logs")
            st.dataframe(df_tokens, use_container_width=True)
            
        except Exception as e:
            st.error(f"Error parsing token usage logs: {str(e)}")
    else:
        st.info("No token usage data found yet. Trigger a workflow to generate token logs.")

# --- Hidden System Logs Tab ---
# (Temporarily commented out for maintenance)
# with tab_logs:
#     st.header("📋 Agent State & Log Monitor")
#     st.markdown("Monitor the raw execution logs, GitHub sync fallbacks, and agent activity.")
#     
#     log_file_path = os.path.join(settings['base_dir'], 'logs', 'github_sync_errors.log')
#     
#     if os.path.exists(log_file_path):
#         with open(log_file_path, 'r') as f:
#             logs = f.read()
#         if logs.strip():
#             st.error("GitHub Sync Fallbacks Detected!")
#             st.code(logs)
#             if st.button("Clear Error Logs"):
#                 open(log_file_path, 'w').close()
#                 st.rerun()
#         else:
#             st.success("No GitHub sync errors detected. All systems healthy.")
#     else:
#         st.info("Log file not found. System hasn't generated errors yet.")

# --- Auto-Refresh Engine ---
# Executed at the very end to ensure all tabs are fully rendered before we sleep/rerun.
if 'should_auto_refresh' in locals() and should_auto_refresh:
    import time
    time.sleep(2)
    st.rerun()

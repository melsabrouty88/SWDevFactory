import streamlit as st
import os
import json
import subprocess

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
tab_home, tab_job_control, tab_traceability, tab_logs = st.tabs([
    "🏠 Home", 
    "⚙️ Job Control", 
    "🔗 Traceability Matrix", 
    "📋 System Logs"
])

with tab_home:
    st.header("Factory Overview")
    st.info("The factory is currently online. Use the Job Control tab to trigger the Orchestrator, or view the Traceability Matrix to inspect output.")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric(label="Active Agents", value="4")
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
        ticket_id = st.text_input("GitHub Issue ID", placeholder="e.g., 123")
        
        if st.button("🚀 Run Factory on Ticket"):
            if ticket_id.strip():
                st.info(f"Triggering Orchestrator for ticket #{ticket_id}...")
                trigger_script = os.path.join(settings['base_dir'], 'triggers', 'run_orchestrator.py')
                try:
                    result = subprocess.run(['python3', trigger_script, '--ticket', ticket_id.strip()], 
                                            capture_output=True, text=True)
                    if result.returncode == 0:
                        st.success(f"Factory completed run for ticket #{ticket_id}.")
                        with st.expander("View Output"):
                            st.code(result.stdout)
                    else:
                        st.error(f"Factory failed for ticket #{ticket_id}.")
                        with st.expander("View Error Log"):
                            st.code(result.stderr)
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
    st.header("Bidirectional Traceability Matrix")
    st.write("*(Component scaffolding - Implementation coming in Step 3)*")

with tab_logs:
    st.header("Agent State & Log Monitor")
    st.write("*(Component scaffolding - Implementation coming in Step 3)*")

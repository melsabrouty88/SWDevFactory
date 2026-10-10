import streamlit as st
import os
import json

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
    st.header("Job Scheduler & Manual Triggers")
    st.write("*(Component scaffolding - Implementation coming in Step 2)*")

with tab_traceability:
    st.header("Bidirectional Traceability Matrix")
    st.write("*(Component scaffolding - Implementation coming in Step 3)*")

with tab_logs:
    st.header("Agent State & Log Monitor")
    st.write("*(Component scaffolding - Implementation coming in Step 3)*")

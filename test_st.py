import pandas as pd
import streamlit as st

df = pd.DataFrame({"A": [1, 2], "B": [3, 4]})
try:
    st.dataframe(df)
    print("dataframe OK")
except Exception as e:
    print(f"dataframe Error: {e}")

try:
    st.bar_chart(df)
    print("bar_chart OK")
except Exception as e:
    print(f"bar_chart Error: {e}")

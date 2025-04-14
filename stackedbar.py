import pandas as pd
import altair as alt

# Load the dataset
file_path = "data.csv"
df = pd.read_csv(file_path, encoding="ISO-8859-1")

# Standardize column names
df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

# Convert funding rounds columns to numeric
funding_rounds = [
    "seed", "round_a", "round_b", "round_c", "round_d", 
    "round_e", "round_f", "round_g", "round_h"
]
df[funding_rounds] = df[funding_rounds].apply(pd.to_numeric, errors="coerce").fillna(0)

# Melt data for visualization
df_melted = df.melt(id_vars=["market"], value_vars=funding_rounds, 
                    var_name="Funding Round", value_name="Total Funding")

# Aggregate total funding by market and funding round
df_grouped = df_melted.groupby(["market", "Funding Round"], as_index=False).sum()

# Filter top markets
top_markets = df_grouped.groupby("market")["Total Funding"].sum().nlargest(30).index
df_top = df_grouped[df_grouped["market"].isin(top_markets)]

# Calculate total funding per market for percentage
df_total = df_top.groupby("market")["Total Funding"].sum().reset_index(name="Total Market Funding")
df_top = df_top.merge(df_total, on="market")
df_top["Percentage"] = (df_top["Total Funding"] / df_top["Total Market Funding"]) * 100

# Ensure ordered round list with 'seed' first
ordered_rounds = ["seed", "round_a", "round_b", "round_c", "round_d", 
                  "round_e", "round_f", "round_g", "round_h"]
df_top["Funding Round"] = pd.Categorical(df_top["Funding Round"], categories=ordered_rounds, ordered=True)

# Create a numeric column to control stacking order
round_order = {name: i for i, name in enumerate(ordered_rounds)}
df_top["Funding Round Order"] = df_top["Funding Round"].map(round_order)

# Create dropdown param for filtering
dropdown = alt.binding_select(options=["All"] + ordered_rounds, name="Filter by Round: ")
funding_param = alt.param("round_filter", bind=dropdown, value="All")

# Create horizontal stacked bar chart with enforced stacking
chart = alt.Chart(df_top).mark_bar().encode(
    y=alt.Y("market:N", title="Market", sort="-x"),
    x=alt.X("Total Funding:Q", title="Total Funding (USD)"),
    color=alt.Color("Funding Round:N", title="Funding Round",
                    scale=alt.Scale(scheme="blues"), sort=ordered_rounds),
    order=alt.Order("Funding Round Order:O"),  # Ensures seed is stacked first
    tooltip=[
        alt.Tooltip("market:N", title="Market"),
        alt.Tooltip("Funding Round:N", title="Round"),
        alt.Tooltip("Total Funding:Q", title="Funding ($)", format="~s"),
        alt.Tooltip("Percentage:Q", title="Share (%)", format=".2f")
    ]
).transform_filter(
    (alt.datum["Funding Round"] == funding_param) | (funding_param == "All")
).add_params(
    funding_param
).properties(
    width=800,
    height=600,
    title="Funding Rounds by Market (Horizontal Stacked Bar)"
)

# Show chart
chart.show()
chart.save("fundingrounds.html", format="html")

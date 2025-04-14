import pandas as pd
import plotly.express as px

# Load the dataset
file_path = "data.csv"
df = pd.read_csv(file_path, encoding="ISO-8859-1")

# Standardize column names
df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

# Selecting relevant columns
funding_rounds_col = "funding_rounds"
funding_sources = [
    "seed", "venture", "equity_crowdfunding", "undisclosed", "convertible_note",
    "debt_financing", "angel", "grant", "private_equity", "post_ipo_equity",
    "post_ipo_debt", "secondary_market", "product_crowdfunding"
]

# Bucket funding rounds into categories
df["funding_round_group"] = pd.cut(df[funding_rounds_col], 
                                   bins=[0, 3, 6, float("inf")], 
                                   labels=["1-3 Rounds", "4-6 Rounds", "7+ Rounds"])

# Melt dataset to long format for funding sources
df_melted = df.melt(id_vars=["funding_round_group"], value_vars=funding_sources, 
                    var_name="funding_source", value_name="amount")

# Drop missing and zero entries
df_melted = df_melted.dropna().query("amount > 0")

# Group and sum funding amounts
df_treemap = df_melted.groupby(["funding_round_group", "funding_source"]).sum().reset_index()

# Treemap
fig = px.treemap(
    df_treemap,
    path=["funding_round_group", "funding_source"],
    values="amount",
    color="funding_round_group",
    title="Treemap: Funding Sources by Number of Rounds"
)

# Basic layout for display
fig.update_layout(margin=dict(t=80, l=25, r=25, b=25))
fig.show()

# Optionally save to HTML
fig.write_html("treemap_funding_sources.html")

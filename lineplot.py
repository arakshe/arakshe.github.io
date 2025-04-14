import pandas as pd
import altair as alt

# Load and clean dataset
df = pd.read_csv('data.csv', encoding='latin1')
df.columns = df.columns.str.strip().str.lower()

# Clean funding_total_usd
df['funding_total_usd'] = (
    df['funding_total_usd']
    .astype(str)
    .str.replace(',', '', regex=False)
    .str.strip()
    .replace('-', '0')
)
df['funding_total_usd'] = pd.to_numeric(df['funding_total_usd'], errors='coerce').fillna(0.0)

# Convert date and extract year
df['first_funding_at'] = pd.to_datetime(df['first_funding_at'], errors='coerce')
df['first_funding_year'] = df['first_funding_at'].dt.year

# Group by year
funding_over_time = df.groupby('first_funding_year').agg(
    total_funding=('funding_total_usd', 'sum'),
    startup_count=('name', 'count')
).reset_index()

# Filter valid years
funding_over_time = funding_over_time[
    (funding_over_time['total_funding'] > 0) &
    (funding_over_time['first_funding_year'].notna()) &
    (funding_over_time['first_funding_year'] >= 1996) &
    (funding_over_time['first_funding_year'] <= pd.Timestamp.now().year)
]

# Base line chart
line_chart = alt.Chart(funding_over_time).mark_line(point=True).encode(
    x=alt.X('first_funding_year:O', title='First Funding Year'),
    y=alt.Y('total_funding:Q', title='Total Funding ($)', axis=alt.Axis(format='$,.0f')),
    tooltip=[
        alt.Tooltip('first_funding_year:O', title='Year'),
        alt.Tooltip('total_funding:Q', title='Total Funding', format='$,.0f'),
        alt.Tooltip('startup_count:Q', title='Startup Count')
    ]
).properties(
    width=700,
    height=400
)

# Event data
events_data = pd.DataFrame({
    'first_funding_year': [1999, 2001, 2005, 2008, 2010, 2013],
    'event': [
        'Dot-Com',
        'Crash / 9/11',
        'Web 2.0',
        '2008 Crisis',
        'Cloud & Mobile',
        'Rebound'
    ]
})

# Dashed vertical lines for events
event_rules = alt.Chart(events_data).mark_rule(
    color='steelblue',
    strokeDash=[5, 5]
).encode(
    x=alt.X('first_funding_year:O')
)

# Vertical upward labels, right of the line, placed high
event_text = alt.Chart(events_data).mark_text(
    angle=270,
    align='right',
    baseline='middle',
    dx=10,              # shift text to the right of the line
    dy=-20,             # move text higher
    fontSize=11,
    color='steelblue'
).encode(
    x=alt.X('first_funding_year:O'),
    y=alt.value(40),    # height on chart (lower = higher placement)
    text=alt.Text('event:N')
)

# Combine chart layers
final_chart = alt.layer(
    line_chart,
    event_rules,
    event_text
).properties(
    title='Startup Funding Over Time with Key Events'
)

# Save and display
final_chart.save("funding_timeline_vertical_labels_offset.html")
final_chart

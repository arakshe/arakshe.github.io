const margin = { top: 50, right: 30, bottom: 60, left: 100 },
      width = 960 - margin.left - margin.right,
      height = 700 - margin.top - margin.bottom;

const svg = d3.select("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select(".tooltip");
const rounds = ["round_A", "round_B", "round_C", "round_D", "round_E", "round_F", "round_G"];
let fullData = [];

d3.csv("data-2.csv").then(data => {
  fullData = data.map(d => {
    const cleaned = {};
    Object.entries(d).forEach(([k, v]) => {
      const key = k.trim();
      cleaned[key] = typeof v === "string" ? v.trim() : v;
    });
    return cleaned;
  });

  const statuses = [...new Set(fullData.map(d => d.status).filter(Boolean))];
  const dropdown = d3.select("#statusFilter");
  statuses.sort().forEach(v => {
    dropdown.append("option").attr("value", v).text(v);
  });

  dropdown.on("change", draw);
  draw();
});

function draw() {
  const selectedStatus = d3.select("#statusFilter").property("value");
  const longData = [];

  fullData.forEach(d => {
    if (selectedStatus === "all" || d.status === selectedStatus) {
      rounds.forEach(round => {
        const rawValue = +d[round];
        if (!isNaN(rawValue) && rawValue > 0) {
          const logValue = Math.log10(rawValue);
          longData.push({
            round,
            funding: logValue,
            actual: rawValue,
            company: d.name,
            industry: d["category_list"],
            status: d.status,
            website: d.homepage_url
          });
        }
      });
    }
  });

  const grouped = d3.groups(longData, d => d.round).map(([key, values]) => {
    const fundings = values.map(d => d.funding).sort(d3.ascending);
    const q1 = d3.quantile(fundings, 0.25);
    const median = d3.quantile(fundings, 0.5);
    const q3 = d3.quantile(fundings, 0.75);
    const iqr = q3 - q1;
    const min = d3.max([d3.min(fundings), q1 - 1.0 * iqr]);
    const max = d3.min([d3.max(fundings), q3 + 1.0 * iqr]);
    const outliers = values.filter(d => d.funding < min || d.funding > max);
    return { round: key, q1, median, q3, min, max, outliers, values };
  });

  const x = d3.scaleBand().domain(rounds).range([0, width]).padding(0.1);
  const y = d3.scaleLinear().domain([0, d3.max(grouped, d => d.max || 0)]).nice().range([height, 0]);

  svg.selectAll("*").remove();
  svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y).ticks(10));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Funding Round");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -70)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Log10 of Amount Raised (USD)");

  svg.selectAll(".box")
    .data(grouped)
    .enter()
    .append("rect")
    .attr("class", "box")
    .attr("x", d => x(d.round))
    .attr("width", x.bandwidth())
    .attr("y", d => y(d.q3))
    .attr("height", d => y(d.q1) - y(d.q3))
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`
        <strong>${d.round}</strong><br/>
        Log Median: ${d.median.toFixed(2)}<br/>
        Median: $${Math.pow(10, d.median).toLocaleString()}<br/>
        Min: $${Math.pow(10, d.min).toLocaleString()}<br/>
        Max: $${Math.pow(10, d.max).toLocaleString()}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 40) + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(300).style("opacity", 0));

  svg.selectAll(".median-line")
    .data(grouped)
    .enter()
    .append("line")
    .attr("class", "median-line")
    .attr("x1", d => x(d.round))
    .attr("x2", d => x(d.round) + x.bandwidth())
    .attr("y1", d => y(d.median))
    .attr("y2", d => y(d.median));

  svg.selectAll(".outlier-dot")
    .data(grouped.flatMap(d => d.outliers.map(o => ({ ...o, round: d.round }))))
    .enter()
    .append("circle")
    .attr("class", "outlier-dot")
    .attr("cx", d => x(d.round) + x.bandwidth() / 2)
    .attr("cy", d => y(d.funding))
    .attr("r", 4)
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`
        <strong>${d.company}</strong><br/>
        Round: ${d.round}<br/>
        Log Value: ${d.funding.toFixed(2)}<br/>
        Actual: $${d.actual.toLocaleString()}<br/>

const margin = { top: 50, right: 30, bottom: 60, left: 100 },
      width = 960 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

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
      cleaned[k.trim()] = typeof v === "string" ? v.trim() : v;
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
        const value = +d[round];
        if (!isNaN(value) && value > 0) {
          longData.push({ round, funding: value });
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
    const min = d3.max([d3.min(fundings), q1 - 1.5 * iqr]);
    const max = d3.min([d3.max(fundings), q3 + 1.5 * iqr]);
    const outliers = fundings.filter(f => f < min || f > max);
    return { round: key, q1, median, q3, min, max, outliers };
  });

  const x = d3.scaleBand().domain(rounds).range([0, width]).padding(0.4);
  const y = d3.scaleLinear().domain([0, d3.max(grouped, d => d.max || 0)]).nice().range([height, 0]);

  svg.selectAll("*").remove();

  svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y).ticks(10).tickFormat(d3.format(".2s")));

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
    .text("Amount Raised (USD)");

  // Boxes
  svg.selectAll(".box")
    .data(grouped)
    .enter()
    .append("rect")
    .attr("class", "box")
    .attr("x", d => x(d.round))
    .attr("width", x.bandwidth())
    .attr("y", d => y(d.q3))
    .attr("height", d => y(d.q1) - y(d.q3));

  // Medians
  svg.selectAll(".median-line")
    .data(grouped)
    .enter()
    .append("line")
    .attr("class", "median-line")
    .attr("x1", d => x(d.round))
    .attr("x2", d => x(d.round) + x.bandwidth())
    .attr("y1", d => y(d.median))
    .attr("y2", d => y(d.median));

  // Outliers with tooltip
  const outlierDetails = grouped.flatMap(d => {
    return fullData
      .filter(row => (selectedStatus === "all" || row.status === selectedStatus))
      .filter(row => {
        const val = +row[d.round];
        return d.outliers.includes(val);
      })
      .map(row => ({
        round: d.round,
        value: +row[d.round],
        company: row.company,
        status: row.status,
        industry: row.industry,
        website: row.website || ""
      }));
  });

  svg.selectAll(".outlier-dot")
    .data(outlierDetails)
    .enter()
    .append("circle")
    .attr("class", "outlier-dot")
    .attr("cx", d => x(d.round) + x.bandwidth() / 2)
    .attr("cy", d => y(d.value))
    .attr("r", 4)
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`
        <strong>${d.company || "Unknown"}</strong><br/>
        Round: ${d.round}<br/>
        Amount: $${d.value.toLocaleString()}<br/>
        Industry: ${d.industry || "N/A"}<br/>
        Status: ${d.status || "N/A"}<br/>
        ${d.website ? `<a href="${d.website}" target="_blank">Website</a>` : ""}
      `)
      .style("left", (event.pageX + 12) + "px")
      .style("top", (event.pageY - 30) + "px");
    })
    .on("

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
      const value = typeof v === "string" ? v.trim() : v;
      cleaned[key] = (value === "0" || +value === 0) ? null : value;
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
          longData.push({ round, funding: logValue, raw: rawValue });
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
    const outliers = values.filter(d => d.funding < min || d.funding > max);
    return { round: key, q1, median, q3, min, max, outliers };
  });

  const x = d3.scaleBand().domain(rounds).range([0, width]).padding(0.4);
  const y = d3.scaleLinear()
    .domain([d3.min(grouped, d => d.min), d3.max(grouped, d => d.max)])
    .nice()
    .range([height, 0]);

  svg.selectAll("*").remove();

  svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y).ticks(10).tickFormat(d3.format(".2f")));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Funding Round");

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -60)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
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
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill", "#1f77b4");
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`
        <strong>${d.round}</strong><br/>
        Log Median: ${d.median.toFixed(2)}<br/>
        Approx. Median: $${Math.pow(10, d.median).toLocaleString()}<br/>
        Min (log): ${d.min.toFixed(2)}<br/>
        Max (log): ${d.max.toFixed(2)}`)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 40) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill", "steelblue");
      tooltip.transition().duration(300).style("opacity", 0);
    });

  svg.selectAll(".median-line")
    .data(grouped)
    .enter()
    .append("line")
    .attr("class", "median-line")
    .attr("x1", d => x(d.round))
    .attr("x2", d => x(d.round) + x.bandwidth())
    .attr("y1", d => y(d.median))
    .attr("y2", d => y(d.median));

  svg.selectAll(".whisker")
    .data(grouped)
    .enter()
    .append("line")
    .attr("x1", d => x(d.round) + x.bandwidth() / 2)
    .attr("x2", d => x(d.round) + x.bandwidth() / 2)
    .attr("y1", d => y(d.min))
    .attr("y2", d => y(d.q1))
    .attr("stroke", "black");

  svg.selectAll(".whisker2")
    .data(grouped)
    .enter()
    .append("line")
    .attr("x1", d => x(d.round) + x.bandwidth() / 2)
    .attr("x2", d => x(d.round) + x.bandwidth() / 2)
    .attr("y1", d => y(d.max))
    .attr("y2", d => y(d.q3))
    .attr("stroke", "black");

  svg.selectAll(".cap-min")
    .data(grouped)
    .enter()
    .append("line")
    .attr("x1", d => x(d.round) + x.bandwidth() / 4)
    .attr("x2", d => x(d.round) + x.bandwidth() * 0.75)
    .attr("y1", d => y(d.min))
    .attr("y2", d => y(d.min))
    .attr("stroke", "black");

  svg.selectAll(".cap-max")
    .data(grouped)
    .enter()
    .append("line")
    .attr("x1", d => x(d.round) + x.bandwidth() / 4)
    .attr("x2", d => x(d.round) + x.bandwidth() * 0.75)
    .attr("y1", d => y(d.max))
    .attr("y2", d => y(d.max))
    .attr("stroke", "black");

  svg.selectAll(".outlier-dot")
    .data(grouped.flatMap(d => d.outliers.map(v => ({ round: d.round, value: v }))))
    .enter()
    .append("circle")
    .attr("class", "outlier-dot")
    .attr("cx", d => x(d.round) + x.bandwidth() / 2)
    .attr("cy", d => y(d.value))
    .attr("r", 4)
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`<strong>Outlier</strong><br/>Log: ${d.value.toFixed(2)}<br/>Approx: $${Math.pow(10, d.value).toLocaleString()}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 30) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(300).style("opacity", 0);
    });

  // Add regression line through medians
  const lineData = grouped.map(d => ({
    x: x(d.round) + x.bandwidth() / 2,
    y: y(d.median)
  }));

  const line = d3.line()
    .x(d => d.x)
    .y(d => d.y)
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(lineData)
    .attr("fill", "none")
    .attr("stroke", "darkred")
    .attr("stroke-width", 2)
    .attr("d", line);

  svg.selectAll(".median-dot")
    .data(lineData)
    .enter()
    .append("circle")
    .attr("class", "median-dot")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 3)
    .attr("fill", "darkred");
}

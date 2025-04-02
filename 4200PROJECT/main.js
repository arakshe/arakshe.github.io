const margin = { top: 50, right: 180, bottom: 60, left: 80 },
      width = 960 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

const svg = d3.select("svg")
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip");

const color = d3.scaleOrdinal(d3.schemeCategory10);

d3.csv("data-2.csv").then(data => {
  const currentYear = 2025;

  //  Step 1: Trim all column headers and values
  data = data.map(d => {
    const cleaned = {};
    Object.entries(d).forEach(([key, val]) => {
      cleaned[key.trim()] = typeof val === "string" ? val.trim() : val;
    });
    return cleaned;
  });

  //  Step 2: Extract & filter relevant data
  let cleaned = data.map(d => {
    const funding = +d["funding_total_usd"]?.replace(/[^0-9]/g, '') || 0;
    const founded = +d["founded_year"];
    const name = d["name"];
    const status = d["status"];

    return {
      name,
      age: (founded > 1900 && founded < currentYear) ? currentYear - founded : null,
      funding,
      status
    };
  }).filter(d => d.age && d.funding > 0 && d.status);

  //  Step 3: Dropdown & legend setup
  const allStatuses = [...new Set(cleaned.map(d => d.status))];
  color.domain(allStatuses);

  const dropdown = d3.select("#statusFilter");
  allStatuses.forEach(status => {
    dropdown.append("option")
      .attr("value", status)
      .text(status.charAt(0).toUpperCase() + status.slice(1));
  });

  //  Step 4: Scales
  const x = d3.scaleLinear()
    .domain([0, d3.max(cleaned, d => d.age)])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(cleaned, d => d.funding)])
    .range([height, 0]);

  //  Step 5: Axes
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).ticks(10));

  svg.append("g")
    .call(d3.axisLeft(y).ticks(8).tickFormat(d3.format(".2s")));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Startup Age (Years)");

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Total Funding (USD)");

  const plotArea = svg.append("g");

  function updateScatter(filteredData) {
    const circles = plotArea.selectAll("circle")
      .data(filteredData, d => d.name);

    circles.enter()
      .append("circle")
      .attr("cx", d => x(d.age))
      .attr("cy", d => y(d.funding))
      .attr("r", 5)
      .attr("fill", d => color(d.status))
      .attr("opacity", 0.7)
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <strong>${d.name}</strong><br/>
          Age: ${d.age} years<br/>
          Funding: $${d.funding.toLocaleString()}<br/>
          Status: ${d.status}
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 30) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(300).style("opacity", 0);
      })
      .merge(circles)
      .transition()
      .duration(500)
      .attr("cx", d => x(d.age))
      .attr("cy", d => y(d.funding));

    circles.exit().remove();
  }

  //  Step 6: Initial plot
  updateScatter(cleaned);

  //  Step 7: Dropdown filter
  dropdown.on("change", function () {
    const selected = this.value;
    const filtered = selected === "all"
      ? cleaned
      : cleaned.filter(d => d.status === selected);
    updateScatter(filtered);
  });

  //  Step 8: Legend
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width + 20}, 20)`);

  allStatuses.forEach((status, i) => {
    const legendRow = legend.append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    legendRow.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(status));

    legendRow.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .text(status);
  });
});



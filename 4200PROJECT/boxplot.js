const margin = { top: 50, right: 30, bottom: 60, left: 100 },
      width = 960 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

const svg = d3.select("svg")
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select(".tooltip");
const rounds = ["round_A", "round_B", "round_C", "round_D", "round_E", "round_F", "round_G"];
let fullData = [];

d3.csv("data-2.csv").then(data => {
  data = data.map(d => {
    const cleaned = {};
    Object.entries(d).forEach(([k, v]) => {
      cleaned[k.trim()] = typeof v === "string" ? v.trim() : v;
    });
    return cleaned;
  });

  fullData = data;

  populateDropdown("statusFilter", [...new Set(data.map(d => d.status).filter(Boolean))]);
  update();

  d3.select("#statusFilter").on("change", update);
});

function populateDropdown(id, values) {
  const dropdown = d3.select(`#${id}`);
  values.sort().forEach(v => {
    dropdown.append("option").attr("value", v).text(v);
  });
}

function update() {
  const selectedStatus = d3.select("#statusFilter").property("value");

  let longData = [];

  fullData.forEach(d => {
    if (selectedStatus === "all" || d.status === selectedStatus) {
      rounds.forEach(round => {
        const value = +d[round];
        if (value > 0) {
          longData.push({ round, funding: value });
        }
      });
    }
  });

const margin = { top: 50, right: 30, bottom: 60, left: 100 },
      width = 960 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

const svg = d3.select("svg")
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select(".tooltip");
const rounds = ["round_A", "round_B", "round_C", "round_D", "round_E", "round_F", "round_G"];
let fullData = [];

d3.csv("data-2.csv").then(data => {
  data = data.map(d => {
    const cleaned = {};
    Object.entries(d).forEach(([k, v]) => {
      cleaned[k.trim()] = typeof v === "string" ? v.trim() : v;
    });
    return cleaned;
  });

  fullData = data;

  populateDropdown("statusFilter", [...new Set(data.map(d => d.status).filter(Boolean))]);
  update();

  d3.select("#statusFilter").on("change", update);
});

function populateDropdown(id, values) {
  const dropdown = d3.select(`#${id}`);
  values.sort().forEach(v => {
    dropdown.append("option").attr("value", v).text(v);
  });
}

function update() {
  const selectedStatus = d3.select("#statusFilter").property("value");

  let longData = [];

  fullData.forEach(d => {
    if (selectedStatus === "all" || d.status === selectedStatus) {
      rounds.forEach(round => {
        const value = +d[round];
        if (value > 0) {
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
  const y = d3.scaleLinear().domain([0, d3.max(grouped, d => d.max || 0)]).range([height, 0]);

  svg.selectAll("*").remove();

  svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y).ticks(10).tickFormat(d3.format(".2s")));

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
    .text("Amount Raised (USD)");

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
        Min: $${Math.round(d.min).toLocaleString()}<br/>
        Q1: $${Math.round(d.q1).toLocaleString()}<br/>
        Median: $${Math.round(d.median).toLocaleString()}<br/>
        Q3: $${Math.round(d.q3).toLocaleString()}<br/>
        Max: $${Math.round(d.max).toLocaleString()}
      `)
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
      tooltip.html(`<strong>Outlier</strong><br/>$${d.value.toLocaleString()}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 30) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(300).style("opacity", 0);
    });
}
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
  const y = d3.scaleLinear().domain([0, d3.max(grouped, d => d.max || 0)]).range([height, 0]);

  svg.selectAll("*").remove();

  svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y).ticks(10).tickFormat(d3.format(".2s")));

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
    .text("Amount Raised (USD)");

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
        Min: $${Math.round(d.min).toLocaleString()}<br/>
        Q1: $${Math.round(d.q1).toLocaleString()}<br/>
        Median: $${Math.round(d.median).toLocaleString()}<br/>
        Q3: $${Math.round(d.q3).toLocaleString()}<br/>
        Max: $${Math.round(d.max).toLocaleString()}
      `)
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
      tooltip.html(`<strong>Outlier</strong><br/>$${d.value.toLocaleString()}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 30) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(300).style("opacity", 0);
    });
}


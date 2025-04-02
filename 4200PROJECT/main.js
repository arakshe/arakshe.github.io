const margin = { top: 60, right: 30, bottom: 50, left: 180 },
      width = 900 - margin.left - margin.right,
      height = 800 - margin.top - margin.bottom;

const svg = d3.select("svg")
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip");

d3.csv("data-2.csv").then(data => {
  data = data.map(d => ({
    market: d.market,
    funding_total_usd: +d.funding_total_usd.replace(/[^0-9]/g, '') || 0

  }));

  const fundingByMarket = d3.rollup(
    data,
    v => d3.sum(v, d => d.funding_total_usd),
    d => d.market
  );

  const marketData = Array.from(fundingByMarket, ([market, total]) => ({ market, total }))
    .filter(d => d.market && d.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 30); // Top 30 markets

  const y = d3.scaleBand()
    .domain(marketData.map(d => d.market))
    .range([0, height])
    .padding(0.05);

  const x = d3.scaleBand()
    .domain(["Total Funding"])
    .range([0, width])
    .padding(0.05);

  const color = d3.scaleSequential()
    .interpolator(d3.interpolateBlues)
    .domain([0, d3.max(marketData, d => d.total)]);

  svg.append("g")
    .call(d3.axisLeft(y));

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.selectAll()
    .data(marketData)
    .enter()
    .append("rect")
    .attr("x", d => x("Total Funding"))
    .attr("y", d => y(d.market))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("class", "cell")
    .style("fill", d => color(d.total))
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`<strong>${d.market}</strong><br/>$${d.total.toLocaleString()}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(300).style("opacity", 0);
    });
});

//calling the forcegraph function from the repository 
chart = { 
    let normalChart = researchGraph.forceGraph(data, d3, html, {
    width,
    height: 600,
    nodeRadiusDuration: 1000,
    graphTransition: 500,
    linkStrokeWidth: 2
  })
    return normalChart;
  }

//code to import the repository
researchGraph = await import("https://cdn.jsdelivr.net/gh//researchgraph/lab-project-01/researchgraph.js")

//code to import the the data into a variable
data = FileAttachment("data.json").json();
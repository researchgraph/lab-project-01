export function forceGraph(data, d3, html, {
  nodeStrokeWidth = 1.5, 
  nodeStrokeOpacity = 1, 
  nodeRadius = 10, 
  strength = -200,
  linkSource = ({source}) => source, 
  linkTarget = ({target}) => target, 
  linkStrokeOpacity = 0.6,
  linkStrokeWidth = 1.5,
  width = 640, 
  height = 400,
  nodeRadiusDuration,
  graphTransition = 500
} = {}) {

  let {nodes, links} = convertData(data);
  
  const N = d3.map(nodes, d => d.key).map(intern);
  const LS = d3.map(links, linkSource).map(intern);
  const LT = d3.map(links, linkTarget).map(intern);
  const T = d3.map(nodes, d => d.title || d.full_name || d.name);
  const G = d3.map(nodes, d => d.group).map(intern);
  const W = typeof linkStrokeWidth !== "function" ? null : d3.map(links, linkStrokeWidth);
  let isPaused = false;

  nodes = d3.map(nodes, (_, i) => ({id: N[i]}));
  links = d3.map(links, (_, i) => ({source: LS[i], target: LT[i]}));

  const forceLink = d3.forceLink(links).id(({index: i}) => N[i]);

  var zoom = d3.zoom()
              .scaleExtent([0.1, 10])
              .on("zoom", function(e) {
                d3.select('.node').attr('transform', e.transform);
                d3.select('.lines').attr('transform', e.transform);
                var scale = e.transform.k;
                if(scale < 0.8) {
                  d3.selectAll(".text-box").style("display", "none");
                  d3.selectAll(".text-box-content").style("display", "none");
                } else {
                  d3.selectAll(".text-box").style("display", "block");
                  d3.selectAll(".text-box-content").style("display", "block");
                }
                if (scale < 0.4) {
                  d3.selectAll(".material-icons-round").style("display", "none");
                } else {
                  d3.selectAll(".material-icons-round").style("display", "block");
                }
              });
  
  let simulation = d3.forceSimulation(nodes)
      .force("link", forceLink)
      .force("charge", d3.forceManyBody().strength(strength))
      .force("center",  d3.forceCenter())
      .on("tick", ticked);

  const svg = d3.select('body').append('svg').attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
      .call(zoom);
  
  const link = svg.append("g").attr('class','lines')
      .attr("stroke", "#999")
      .attr("stroke-opacity", linkStrokeOpacity)
      .attr("stroke-width", typeof linkStrokeWidth !== "function" ? linkStrokeWidth : null)
      .attr("stroke-linecap", "round")
      .selectAll("line")
      .data(links)
      .join("line");

  var node = svg.append("g")
    .attr('class','node')
    .selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .call(drag(simulation));

  node.append('circle')
    .attr('r', nodeRadius)
    .attr("stroke", ({index: i}) => getStrokeColor(G[i]))
    .attr("stroke-opacity", nodeStrokeOpacity)
    .attr("fill", ({index: i}) => getColor(G[i]))
    .attr("stroke-width", nodeStrokeWidth);
  
  node.append('text')
    .attr('x', -6)
    .attr('y', 6)
    .attr("class", "material-icons-round")
    .attr("font-family", "Material Icons")
    .text(function(d, i) {
      return getIcon(G[i]);    
    });

  // node.append("rect")
  //   .attr("class", "text-box")
  //   .attr("x", -15)
  //   .attr("y", 12.5)
  //   .style("fill", "#fff")
  //   .style("stroke", "#000");

  // node.append("text")
  //   .attr("class", "text-box-content")
  //   .attr("text-anchor", "middle")
  //   .attr("alignment-baseline", "middle")
  //   .attr("x", 0)
  //   .attr("y", 20)
  //   .style("font-size", "5px")
  //   .text(function(d,i) { return T[i].split(" ").join("\n"); });
  
  // node.select(".text-box")
  //   .attr("width",  function(d) { return this.nextSibling.getBBox().width + 8; })
  //   .attr("height", function(d) { return this.nextSibling.getBBox().height + 8; }); //10

  zoom.scaleBy(svg.transition().duration(graphTransition), 0.4);

  
  node.on("mouseover", function(d, datum) {
    if(!isPaused) {
      simulation.force("x", null).force("y", null).alpha(0.1).restart();
    }
    let neighbourNodes = [];
    neighbourNodes.push(datum.id);
    links.forEach(function(l) {
        if(l.source.id === datum.id) {
          neighbourNodes.push(l.target.id)
        }

      if(l.target.id === datum.id) {
          neighbourNodes.push(l.source.id)
        }
      });
    let nodeGroup =  svg.selectAll("circle").each(function(d, i) {
      if(neighbourNodes.includes(d.id)) {
        d3.select(this).transition().duration(nodeRadiusDuration).attr("r", nodeRadius + 10);
      }
    })
  }).on("mouseout", function(e){
    svg.selectAll("circle").transition().duration(100).attr("r", nodeRadius);
  });

  const zoomIn = () => {
    zoom.scaleBy(svg.transition().duration(graphTransition), 1.2);
  };
  
  const zoomOut = () => {
    zoom.scaleBy(svg.transition().duration(graphTransition), 1 / 1.2);
  };
  
  const resetViewport = () => {
      svg.transition()
          .duration(graphTransition)
          .call(zoom.transform, d3.zoomIdentity.translate(0,0).scale(0.4));
      simulation.alpha(1).restart();
  };
  
  const pausePlay = () => {
    isPaused = !isPaused;
    if (isPaused) {
      simulation.alpha(0).stop();
    } else {
      simulation.alpha(0.1).restart();
    }
  };
  
  if (W) link.attr("stroke-width", ({index: i}) => W[i]);
  if (T) node.append("title").text(({index: i}) => T[i]);

  function intern(value) {
    return value !== null && typeof value === "object" ? value.valueOf() : value;
  }

  function ticked() {
    link
      .transition().duration(graphTransition).ease(d3.easeLinear)
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);


    node
      .transition().duration(graphTransition).ease(d3.easeLinear)
      .attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    });
    
  }

  function drag(simulation) {    
    function dragstarted(event) {
      if (!event.active && !isPaused) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event) {
      if (!event.active && !isPaused) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }
  
  const container = html`
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
      <style> .material-icons-round { font-family: 'Material Icons', serif; font-size: 12.5px; fill: white; weight: 100; grade: -25; } </style>
      <div style="position: relative"></div>`;
  const toolbar = html`<div style="position: absolute; top: 0; left: 0; margin: 5px"></div>`;
  container.appendChild(toolbar);
  const zoomInButton = html`<button>+</button>`;
  zoomInButton.addEventListener('click', () => zoomIn());
  toolbar.appendChild(zoomInButton);
  const zoomOutButton = html`<button>−</button>`;
  zoomOutButton.addEventListener('click', () => zoomOut());
  toolbar.appendChild(zoomOutButton);
  const resetButton = html`<button>Reset</button>`;
  resetButton.addEventListener('click', () => resetViewport());
  toolbar.appendChild(resetButton);
  const stop = html`<button>Pause/Play</button>`;
  stop.addEventListener('click', () => pausePlay());
  toolbar.appendChild(stop);
  container.appendChild(svg.node());
  
  return container;
}

export function transformLinks(data) {
  let newArray = [];
  for(let i=0; i<data.length; i++) {
    let object = data[i];
    let newObject = {
      source: object.from,
      target: object.to
    }
    newArray.push(newObject);
  }
  return newArray;
}


export function addGroup(data, number) {
  let newArray = [];
  for(let i=0; i<data.length; i++) {
    let object = data[i];
    object.group = number;
    newArray.push(object);
  }
  return newArray;
}

export function convertData(rawData) {
  let modified = ({ nodes: [], links:[] });
  modified.nodes = addGroup(rawData[0].nodes.datasets, 1); 
  modified.nodes.push(...addGroup(rawData[0].nodes.researchers, 2));
  modified.nodes.push(...addGroup(rawData[0].nodes.grants, 3));
  modified.nodes.push(...addGroup(rawData[0].nodes.organisations, 4));
  modified.nodes.push(...addGroup(rawData[0].nodes.publications, 5));

  modified.links = transformLinks(rawData[0].relationships["researcher-dataset"]);
  modified.links.push(...transformLinks(rawData[0].relationships["researcher-grant"]));
  modified.links.push(...transformLinks(rawData[0].relationships["researcher-organisation"]));
  modified.links.push(...transformLinks(rawData[0].relationships["researcher-publication"]));
  modified.links.push(...transformLinks(rawData[0].relationships["researcher-researcher"]));
  
  return modified;
}

export function getColor(group) {
  const colors = new Map([
  [1, "#EB6E1F"],
  [2, "#63CC9E"],
  [3, "#FFD66C"],
  [4, "#9662D0"],
  [5, "#55BFF6"]
]);
  return colors.get(group);
} 

export function getStrokeColor(group) {
  const colors = new Map([
  [1, "#b84a03"],
  [2, "#56b38c"],
  [3, "#f3b835"],
  [4, "#65428e"],
  [5, "#4ba9dc"]
]);
  return colors.get(group);
} 

export function getIcon(group) {
  const icons = new Map([
  [1, "storage"],
  [2, "person"],
  [3, "description"],
  [4, "account_balance"],
  [5, "library_books"]
]);
  return icons.get(group);
} 
poisson = function(mean){
    var L = Math.exp(-mean);
    var p = 1.0;
    var k = 0;

    do {
        k++;
        p *= Math.random();
    } while (p > L);

    return (k - 1);

}


var diagram = flowchart.parse(`st=>start: Susceptible
                               stg1=>operation: Exposed
                               stg2=>operation: Infected
                               e=>end: Zombie
                               st->stg1->stg2->e`);
diagram.drawSVG('SEIRdiagram');

var diagram2 = flowchart.parse(`st=>start: Susceptible
                               stg1=>operation: Infected
                               e=>end: Zombie
                               st->stg1->e`);
diagram2.drawSVG('SIRdiagram');


var treeData = [
  {
    "name": "Top Level",
    "parent": "null",
    "children": [
      {
        "name": "Level 2: A",
        "parent": "Top Level",
        "children": [
          {
            "name": "Son of A",
            "parent": "Level 2: A"
          },
          {
            "name": "Daughter of A",
            "parent": "Level 2: A"
          }
        ]
      },
      {
        "name": "Level 2: B",
        "parent": "Top Level"
      }
    ]
  }
];

var createTreeList= function(r0,generations){
    if(generations===undefined){
        generations = 3;
    }
    var arr = [{name: "0", id:"0"}];
    var id = 0;
    var ngi = [id]; //next gen indices
    for (var gen =0; gen<generations; gen++){
        var ngi_buffer = [];
        for (var i = 0; i < ngi.length; i++ ){
            for(var child = 0; child < poisson(r0); child++){ /* start of children */
                id += 1;
                arr.push({name: String(id),
                        id:String(id),
                        parent:String(ngi[i])
                    });
                ngi_buffer.push(id);
            } /* end of children */

        } /* end of generation */
        ngi = ngi_buffer.slice();
    }
    return arr;
}

function treeDataGenerator(r0,generations){



    var arr = createTreeList(r0,generations);

    // we use a map for search for the nodes by their ids
    var nodes_map = {};

    // we copy all the elements into the map, where the keys are the ids of the nodes
    for ( var i=0; i<arr.length; ++i )
    {
        // create nodes array for each node
        arr[ i ].children = [];

        // copy into the map
        nodes_map[ arr[i].id.toString() ] = arr[ i ];
    }

    // we iterate through all nodes, and add them into their parent's node array
    for ( var key in nodes_map )
    {
        // current node
        var node = nodes_map[ key ];

        // if the current node have idParent property, and the parent exists in the map
        if ( "parent" in node && node.parent.toString() in nodes_map )
        {
            // we add the current node to the parent's nodes array
            nodes_map[ node.parent.toString() ].children.push( node );
        }
    }

    // we remove all the nodes from the map, that has parents
    for ( var key in nodes_map )
    {
        // current node
        var node = nodes_map[ key ];

        // if it has idParent property
        if ( "parent" in node )
        {
            // we remove from the map
            delete nodes_map[ key ];
        }
    }

    // results array
    var new_arr = [];
    // copy back the nodes from the map into an array
    for ( var key in nodes_map )
    {
        new_arr.push( nodes_map[ key ] );
    }
    return new_arr;
}

//var arr = createTreeList(3,3);




function generateTreeDiagram(r0,generations,reset){
    if (reset===undefined){
        reset = false;
    }

    var treeData = treeDataGenerator(r0,generations);
    // ************** Generate the tree diagram	 *****************
    var margin = {top: 20, right: 120, bottom: 20, left: 120},
    	width = 960 - margin.right - margin.left,
    	height = 500 - margin.top - margin.bottom;

    var i = 0,
    	duration = 750,
    	root;

    var tree = d3.layout.tree()
    	.size([height, width]);

    var diagonal = d3.svg.diagonal()
    	.projection(function(d) { return [d.y, d.x]; });

    var svg;

    if(reset){
        svg = d3.select("#r0Diagram").select("svg");
        svg.selectAll("*").remove();
        svg = svg.append("g")
                 .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    } else {

        svg = d3.select("#r0Diagram").append("svg")
    	.attr("width", width + margin.right + margin.left)
    	.attr("height", height + margin.top + margin.bottom)
      .append("g")
    	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    }

    root = treeData[0];
    root.x0 = height / 2;
    root.y0 = 0;

    update(root);

    d3.select(self.frameElement).style("height", "500px");

    function update(source) {

      // Compute the new tree layout.
      var nodes = tree.nodes(root).reverse(),
    	  links = tree.links(nodes);

      // Normalize for fixed-depth.
      nodes.forEach(function(d) { d.y = d.depth * 180; });

      // Update the nodes…
      var node = svg.selectAll("g.node")
    	  .data(nodes, function(d) { return d.id || (d.id = ++i); });

      // Enter any new nodes at the parent's previous position.
      var nodeEnter = node.enter().append("g")
    	  .attr("class", "node")
    	  .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
    	  .on("click", click);

      nodeEnter.append("circle")
    	  .attr("r", 1e-6)
    	  .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

      nodeEnter.append("text")
    	  .attr("x", function(d) { return d.children || d._children ? -13 : 13; })
    	  .attr("dy", ".35em")
    	  .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
    	  .text(function(d) { return d.name; })
    	  .style("fill-opacity", 1e-6);

      // Transition nodes to their new position.
      var nodeUpdate = node.transition()
    	  .duration(duration)
    	  .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

      nodeUpdate.select("circle")
    	  .attr("r", 10)
    	  .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

      nodeUpdate.select("text")
    	  .style("fill-opacity", 1);

      // Transition exiting nodes to the parent's new position.
      var nodeExit = node.exit().transition()
    	  .duration(duration)
    	  .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
    	  .remove();

      nodeExit.select("circle")
    	  .attr("r", 1e-6);

      nodeExit.select("text")
    	  .style("fill-opacity", 1e-6);

      // Update the links…
      var link = svg.selectAll("path.link")
    	  .data(links, function(d) { return d.target.id; });

      // Enter any new links at the parent's previous position.
      link.enter().insert("path", "g")
    	  .attr("class", "link")
    	  .attr("d", function(d) {
    		var o = {x: source.x0, y: source.y0};
    		return diagonal({source: o, target: o});
    	  });

      // Transition links to their new position.
      link.transition()
    	  .duration(duration)
    	  .attr("d", diagonal);

      // Transition exiting nodes to the parent's new position.
      link.exit().transition()
    	  .duration(duration)
    	  .attr("d", function(d) {
    		var o = {x: source.x, y: source.y};
    		return diagonal({source: o, target: o});
    	  })
    	  .remove();

      // Stash the old positions for transition.
      nodes.forEach(function(d) {
    	d.x0 = d.x;
    	d.y0 = d.y;
      });
    }

    // Toggle children on click.
    function click(d) {
      if (d.children) {
    	d._children = d.children;
    	d.children = null;
      } else {
    	d.children = d._children;
    	d._children = null;
      }
      update(d);
    }
}

generateTreeDiagram(1.5,4);
d3.select("#r0DiagramSimulate").on('click',function(){
    var r0 = parseFloat($('#r0Selector').val());
    generateTreeDiagram(r0,3,true);
});




/* model fitting introduction */

genLine = function(m,c,sig){
  if(sig == undefined){
      sig = 0;
  }
  var N = 10;
  var dt = 1/N;
  var t = 0;
  var x =[],y=[];
  for(var i = 0; i < N; i++){
      t = i*dt;
      x.push(t);

      y.push(m*t+c+ sig*(0.5 - Math.random()));

  }
  return {x:x,y:y}
}


function plotGraph(div,res,data){
  var shapes = [];
  var mse = 0;

  var texts = {
  x: [],
  y: [],
  text: [],
  name: 'square error',
  mode: 'text'
  };
  var dx = res.x[1] - res.x[0];
  for (var i = 0; i < res.x.length; i++){
      var error = Math.pow(res.y[i]-data.y[i],2);

      texts.x.push(res.x[i]+0.25*dx);
      texts.y.push(.5*(res.y[i]+data.y[i]));
      texts.text.push(error.toFixed(2));

      mse += error;
      shapes.push({
          type: 'line',
          x0: res.x[i],
          y0: res.y[i],
          x1: data.x[i],
          y1: data.y[i],
          line: {
            color: 'rgb(50, 171, 96)',
            width: 4,
            dash: 'dashdot'
          }
      });
  } /* end of for loop */
  mse = Math.sqrt(mse);


  trace = {
    x: res.x,
    y: res.y,
    name: 'model',
    type: 'scatter'
  };

  traceData = {
    x: data.x,
    y: data.y,
    name: 'data',
    mode: 'markers',
    type: 'scatter'
  };

  plotData = [trace,traceData,texts];

  var layout = { //main layout format for plot.ly chart
    title: 'Mean squared error :'+mse.toFixed(2),
    autosize: true,
    showlegend: true,
    hovermode: 'closest',
    textposition: 'top right',
    xaxis: {
      title: 'x',
      showgrid: true,
      zeroline: false
    },
    yaxis: {
      title: 'y',
      showline: false,
      rangemode: 'tozero',
      autorange: true,
      zeroline: true
    },
    shapes: shapes
  };

  Plotly.newPlot(div, plotData, layout);
}



var lineData = genLine(2,0.5,1);

plotGraph("fitGraphDiv",genLine(1,1),lineData);

d3.selectAll("#mSelector, #cSelector").on("propertychange change click keyup input paste",function(){
    var m = parseFloat($('#mSelector').val());
    var m = parseFloat($('#cSelector').val());
    plotGraph("fitGraphDiv",genLine(m,c),lineData);
});

d3.selectAll(".btn-info").on("click",function(){
    var m = parseFloat($('#mSelector').val());
    var c = parseFloat($('#cSelector').val());
    plotGraph("fitGraphDiv",genLine(m,c),lineData);
});

$(document).ready(function(){
    $('[data-toggle="tooltip"]').tooltip();
});

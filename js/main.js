// Following this idea: https://hacks.mozilla.org/2011/12/faster-canvas-pixel-manipulation-with-typed-arrays/


function ImageItem(src) {
  this.image = new Image();
  this.image.src = src;
}

function convertImageArray(img){
    return Array.from(img.data)
}

function copyArray(array,zero){
    var res = [];
    for (var i = 0; i <array.length; i++){
        var row = [];
        for(var j = 0; j < array[0].length; j++){
                if(zero === true)
                    row.push(0);
                else
                    row.push(array[i][j]);

        }
        res.push(row);
    }
    return res;

}

function Simulation(map){
    this.initialise = function(){
        this.S = copyArray(map.dataset);
        this.I = copyArray(map.dataset,true);
        this.statistics = {}; //store statistics such as total infected here.
        this.infLocs = [];
        for(var i = 0; i < this.S.length; i++){
                for(var j = 0; j < this.S[0].length; j++){
                    if (this.S[i][j] > 1){
                        this.infLocs.push([i,j]);
                    }
                }
        }
    }

    this.initialise();
    //var i = 190,j=500;
    //var i = 100,j=180;
    //var i = 100,j=250;
    this.infLocs = [];
    //this.I[i][j] = 1;
    //this.S[i][j] = this.S[i][j] - this.I[i][j];
    for(var i = 0; i < this.S.length; i++){
            for(var j = 0; j < this.S[0].length; j++){
                if (this.S[i][j] > 1){
                    this.infLocs.push([i,j]);
                }
            }
    }


    this.params = {beta: 10.0, gamma: 1/3.0, tau: 0.01, sim_speed: 10};
    this.t = 0;
    this.graph_data = [{x:[], y:[],type: 'scatter'}];
    this.dt = 0.0005;
    this.map = map;
    this.play = false;

    function neighbourhoodCalc(array,i,j){
        return array[i+1][j] + array[i-1][j] +
               array[i][j-1] + array[i][j+1] +
               array[i+1][j-1] + array[i+1][j+1] +
               array[i-1][j-1] + array[i-1][j+1] -8*array[i][j];
    }



    this.recordStatistics = function(){
        var infs = 0;
        for(loc in this.infLocs){
            var i = this.infLocs[loc][0],j=this.infLocs[loc][1];
            infs += this.I[i][j];
        }
        this.statistics.infs = infs;
        d3.select('#stats').text('Outbreak of ' + Math.floor(infs) + ' zombies');
        this.graph_data[0].x.push(this.t); this.graph_data[0].y.push(infs);
        Plotly.extendTraces('graph-plot', {
            x: [[this.t]],
            y: [[infs]]
        },[0]);
        //Plotly.newPlot('graph-plot', this.graph_data);
        //console.log('Infected: ',infs);
    }
    this.EulerStepSI = function(i,j){
        var infs = this.params.beta*this.S[i][j]*this.I[i][j];
        return [
                this.S[i][j] - this.dt * infs,
                this.I[i][j] + this.dt * (infs - this.params.gamma*this.I[i][j] + this.params.tau*neighbourhoodCalc(this.I,i,j))
               ];
    }

    this.stepForward = function(){
        var bS = copyArray(this.S),bI = copyArray(this.I);
        this.t += this.dt;
        for(loc in this.infLocs){
                var i = this.infLocs[loc][0],j=this.infLocs[loc][1];
                var res = this.EulerStepSI(i,j);
                bS[i][j] = res[0]; bI[i][j] = res[1];
        }

        this.S = bS; this.I = bI;
        this.recordStatistics();
    }

    this.drawMap = function(){
        this.map.S = this.S;
        this.map.I = this.I;
        this.map.drawMap();
    }

    this.startSim = function(){
        var obj = this;
        d3.timer(function(){
            if (obj.play){


                obj.stepForward();

                obj.drawMap();
            }
        },500);
    }

    var obj = this;
    d3.select('.mainCanvas').on('click', function() {
        // get mousePositions from the main canvas

        var mouseX = d3.event.layerX || d3.event.offsetX;
        var mouseY = d3.event.layerY || d3.event.offsetY;
        var yy = Math.floor(mouseY/obj.map.yscale),
            xx = Math.floor(mouseX/obj.map.xscale);
        console.log(mouseX,mouseY);
        obj.I[yy][xx] += 1;
    });


}





function Map(data,map_id){
    function bufferMap(data,width,height){
        //buffers map with zeros.
        var res = [];
        var zerorow = [];

        zerorow.push(0);
        for (var x = 0; x < data[0].length; ++x) {
            zerorow.push(0);
        }
        zerorow.push(0);

        res.push(zerorow);
        for (var y = 0; y < data.length; ++y) {
            var row = [];
            row.push(0);
            for (var x = 0; x < data[0].length; ++x) {
                row.push(data[y][x]);
            }
            row.push(0);
            res.push(row);
        }
        res.push(zerorow);
        return res;
    }
    var chartSize = 1000;
    var dataSize = 1000;

    this.dataset = data;
    this.dataset = bufferMap(this.dataset);
    this.map_id = map_id;
    //var olddataset = d3.range(dataSize).map(function(d, i){return d3.range(dataSize).map(function(d, i){return ~~(Math.random()*255);});});

    this.canvas = d3.select(map_id)
        .append('canvas')
        .style({position: 'absolute', width: data[0].length + 'px', height: data.length + 'px'})
        .attr({width: data[0].length, height: data.length})
        .attr('class','mainCanvas')
        .node();

    this.canvasWidth  = this.canvas.width;
    this.canvasHeight = this.canvas.height;
    this.xscale = 2.;
    this.yscale = 2.;

    this.ctx = this.canvas.getContext('2d');
    this.imageData = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);

    this.S = copyArray(this.dataset);
    this.I = copyArray(this.dataset,true);

    this.loadImage = function(data){
        this.dataset = data;
        this.dataset = bufferMap(this.dataset);

        d3.select(map_id).select('canvas')
            .attr({width: data[0].length, height: data.length});

        this.canvasWidth  = this.canvas.width;
        this.canvasHeight = this.canvas.height;
        this.ctx = this.canvas.getContext('2d');
        this.imageData = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);

        this.S = copyArray(this.dataset);
        this.I = copyArray(this.dataset,true);

    }

    this.drawMap = function(){
        d3.select(map_id).select('canvas')
        .style({ width: (this.canvasWidth*this.xscale) + 'px', height: (this.canvasHeight*this.yscale) + 'px'});

        this.ctx = this.canvas.getContext('2d');
        this.imageData = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);


        var buf = new ArrayBuffer(this.imageData.data.length);
        var buf8 = new Uint8ClampedArray(buf);
        var data = new Uint32Array(buf);

        for (var y = 0; y < this.canvasHeight; ++y) {
            for (var x = 0; x < this.canvasWidth; ++x) {
                var yy = Math.floor(y),
                    xx = Math.floor(x);

                var value = this.S[yy][xx];
                var inf = this.I[yy][xx];
                data[y * this.canvasWidth + x] =
                    (255   << 24) |    // alpha
                    (value << 16) |    // blue
                    (value <<  8) |    // green
                    value+inf;            // red
            }
        }

        this.imageData.data.set(buf8);

        this.ctx.putImageData(this.imageData, 0, 0);
    }
    var obj = this;
    d3.select('.mainCanvas').on('click', function() {
        // get mousePositions from the main canvas

        var mouseX = d3.event.layerX || d3.event.offsetX;
        var mouseY = d3.event.layerY || d3.event.offsetY;
        var yy = Math.floor(MouseY/this.yscale),
            xx = Math.floor(MouseX/this.xscale);
        console.log(mouseX,mouseY);
        obj.I[yy][xx] += 1;
    });
    d3.select('.mainCanvas').on('mousemove', function() {


        // get mousePositions from the main canvas
        var mouseX = d3.event.layerX || d3.event.offsetX;
        var mouseY = d3.event.layerY || d3.event.offsetY;

        if (true) {

            // Show the tooltip only when there is nodeData found by the mouse
            var yy = Math.floor(mouseY/obj.yscale),
                xx = Math.floor(mouseX/obj.xscale);
            d3.select('#tooltip')
                .style('opacity', 0.8)
                .style('top', d3.event.pageY + 5 + 'px')
                .style('left', d3.event.pageX + 5 + 'px')
                .html(Math.floor(obj.I[yy][xx]) + ' zombies');//this.I[mouseY][mouseX]);
                //console.log(obj.I[mouseY][mouseX]);

        } else {

            // Hide the tooltip when there our mouse doesn't find nodeData

            d3.select('#tooltip')
                .style('opacity', 0);

        }

    }); // canvas listener/handler

    d3.select('.mainCanvas').on('mouseout', function() {
        d3.select('#tooltip')
            .style('opacity', 0);
    });


}

function getBase64Image(img) {
    // Create an empty canvas element
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    // Copy the image contents to the canvas
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Get the data-URL formatted image
    // Firefox supports PNG and JPEG. You could check img.src to
    // guess the original format, but be aware the using "image/jpg"
    // will re-encode the image.
    //var dataURL = canvas.toDataURL("image/png");

    var result = Array.from(imgData.data.values());
    var vecres = [];
    var elem;
    for (var i = 0; i < Math.floor(img.height); i+=2){
        var row = [];
        for (var j = 0; j < Math.floor(img.width); j+=2){
            elem = result[((i * (img.width * 4)) + (j * 4)) + 2];
            if (elem >= 250) elem = 0;
            row.push(elem);

        }
        vecres.push(row);
    }
    return vecres;
}

var backgroundImage = new ImageItem('./img/north-america.png');
var imageData,map,sim;
backgroundImage.image.onload = function() {
  imageData = getBase64Image(backgroundImage.image);
  map =  new Map(imageData,'#map');
  map.drawMap();
  sim = new Simulation(map);
  sim.drawMap();
  sim.startSim();
  //sim.stepForward();
  //sim.drawMap();

}
var areas = {
    "World": {filename:'./img/world.png'},
    "Vancouver": {filename:'./img/lower-mainland.png'},
    "North America": {filename:'./img/north-america.png'}
};
d3.select('#area-select').on('change',function(value){
    console.log(this.value);
    var area = areas[this.value];
    var backgroundImage = new ImageItem(area.filename);
    backgroundImage.image.onload = function() {
      imageData = getBase64Image(backgroundImage.image);
      //sim.map.loadImage(imageData);
      //sim.initialise();
      d3.select('#map').selectAll("*").remove();
      map =  new Map(imageData,'#map');
      map.drawMap();
      sim = new Simulation(map);
      sim.drawMap();
      sim.startSim();
    }
});

d3.select('#reset').on('click',function(){
    sim.initialise();
    sim.graph_data = [{x:[], y:[],type: 'scatter'}];
    Plotly.newPlot('graph-plot', sim.graph_data);
});

d3.select('#run').on('click',function(){
    if(sim.play){
        sim.play = false;
    } else {
        sim.play = true;
    }
});



var bslider = $('#beta').slider()
		.on('slide', function(){
        sim.params['beta'] =  bslider.getValue();
        })
		.data('slider');

var gslider = $('#gamma').slider()
		.on('slide', function(){
        sim.params['gamma'] =  gslider.getValue();
        })
		.data('slider');

var tslider = $('#sim-speed').slider()
		.on('slide', function(){
        sim.dt =  tslider.getValue();
        })
		.data('slider');

var tauslider = $('#tau').slider()
		.on('slide', function(){
        sim.params['tau'] =  Math.pow(2,tauslider.getValue());
        console.log(sim.params['tau']);
        })
		.data('slider');

function resetGraph(){
  traceS = {
    x: [],
    y: [],
    name: 'Susceptible',
    type: 'scatter'
  };
  traceI = {
    x: [],
    y: [],
    name: 'Infected',
    type: 'scatter'
  };
  t = 0;
  data = [traceS, traceI];

  Plotly.plot('graph-plot', data);
}

resetGraph();
$('#modalButton').on('click',function(){
        $('#myModal').modal('toggle');
});

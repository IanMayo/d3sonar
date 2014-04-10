
d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};
d3.selection.prototype.moveToBack = function() { 
    return this.each(function() { 
        var firstChild = this.parentNode.firstChild; 
        if (firstChild) { 
            this.parentNode.insertBefore(this, firstChild); 
        } 
    }); 
};

var margin = {top: 20, right: 20, bottom: 20, left: 80},
    dimension = document.getElementById("viz_container").getBoundingClientRect(),
    legend_width = 150,
    svg_width = dimension.width - legend_width,
    width = svg_width - margin.left - margin.right,
    height = dimension.height - margin.top - margin.bottom, // control dimension.height to control the viz height
    colors = {
      indicator: "#aace00",
      heading: "#1A68DB"
    },
    data_updation_interval = 1000;  // in milliseconds

var parseDate = d3.time.format("%Y%m%d").parse;

var y = d3.time.scale()
    .range([height, 0])
    ;

var x = d3.scale.linear()
        .domain([0,360])
        .range([0, width]);
    
var color = d3.scale.category10();

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("top");

var yAxis = d3.svg.axis()
    .scale(y)
    .tickFormat(function(d){ 
      return d3.time.format("%H:%M:%S:%L")(d) ; 
    })
    .orient("left");

var strengthScale = d3.scale.linear()
            .domain([1,10])
            .range([50,100]);

var zoom = d3.behavior.zoom()
          .x(x)
          .y(y);
          
var indicator = d3.svg.symbol().type('triangle-up')
          .size(function(d){ return strengthScale(d); });

var line = d3.svg.line()
    .interpolate("basis")
    .y(function(d) { return y(d.date); })
    .x(function(d) { return x(d.degree); });

var svg = d3.select("#viz").append("svg")
    .attr("id", "baseSVG")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var gMain = svg.append("g")
              .classed("gMain",true);

var _map ;

var _map_indicators;

var legend;

var active_timers = [];

//d3.tsv("data.tsv", function(error, data) {
  //color.domain(d3.keys(data[0]).filter(function(key) { return key !== "date"; }));

  var gxAxis = svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0,0)")
      .call(xAxis);

  gxAxis
    .append("rect")
    .moveToBack()
    .attr("y", -gxAxis[0][0].getBoundingClientRect().height)
    .attr("height", gxAxis[0][0].getBoundingClientRect().height)
    .attr("width","100%")
    .style("fill","#ffffff");

  gxAxis
    .append("text")
      .attr("transform", "translate("+width+",0)")
      .attr("y", 0)
      .attr("dy", "1.71em")
      .style("text-anchor", "end")
      .text("Degree º");

  var gyAxis = svg.append("g")
      .attr("class", "y axis")
      .call(yAxis);

  gyAxis
    .append("rect")
    .moveToBack()
    .attr("width", gyAxis[0][0].getBoundingClientRect().width)
    .attr("x", -gyAxis[0][0].getBoundingClientRect().width)
    .attr("height","100%")
    .style("fill","#ffffff");

  gyAxis
    .append("text")
      .attr("transform", "translate(0,"+height+")rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .attr("dx", "2.71em")
      .style("text-anchor", "end")
      .text("Time");

  // create legen
  legend = d3.select("#legend").append("svg")
        .append("g")
        .attr("transform","translate(0,0)");

  //legend.selectAll("g");


function zoomed() {
  //gxAxis.call(xAxis);
  //gyAxis.call(yAxis);
  //gMain.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
};

zoom.on("zoom", zoomed);
// enable zoom
//d3.select("#baseSVG").call(zoom);

  // create a map of key and values
  _map = d3.map([]);

  _map_indicators = d3.map([]);

  var _date_array = [];

  function setDataUpdateRoutine(argument) {
    
    active_timers.push( 
      setInterval(function(){
        addHeading( new Date(), getRandomInt(110,150) );
      }, data_updation_interval )
    );

    active_timers.push( 
      setInterval(function(){
        addDetection(new Date(), 'New Delhi', getRandomInt(110,120), getRandomInt(1,10)  );
      }, data_updation_interval )
    );

    active_timers.push(
      setInterval(function(){
        addDetection(new Date(), 'Bangalore', getRandomInt(140,150), getRandomInt(1,10)  );
      }, data_updation_interval)
    );

    active_timers.push( 
      setInterval(function(){
        addDetection(new Date(), 'Vadodara', getRandomInt(130,140), getRandomInt(1,10)  );
      }, data_updation_interval)
    );

  };

  // Returns a random integer between min and max
  // Using Math.round() will give you a non-uniform distribution!
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  function update_dataset(data_row, purge_old_data) {
    
    var dataset_map,
        purge_old_data_age = 30*1000, // 30 seconds * 1000 milliseconds
        now = new Date().getTime();

    // check if its an indicator
    if (data_row.strength) {
      dataset_map = _map_indicators;
    }else{
      dataset_map = _map;
    };

    // check if key exists
    if ( dataset_map.has(data_row.name) ) {
      // add the data set
      dataset_map.get(data_row.name).push({
          date: data_row.time,
          degree: data_row.value,
          strength: data_row.strength ? data_row.strength : null
        });
    }else{
      // add the new key
      dataset_map.set( data_row.name, [{
          date: data_row.time,
          degree: data_row.value,
          strength: data_row.strength ? data_row.strength : null
        }]
      );
    };

    _date_array.push( data_row.time );

    if (purge_old_data) {
      var last_index = 0;
      // remove old dataset
      dataset_map.values().forEach(function(_d){
        last_index = 0;
        
        if ( (now - new Date(_d[0].date).getTime() ) > purge_old_data_age )  {
          //_d.splice(0, 1);
        };

      });

      if ( (now - new Date(_date_array[0]).getTime() ) > purge_old_data_age ) {
        _date_array.splice(0,1);
      };

    };

  };

  function update() {

    // update dataset
    y.domain(d3.extent(_date_array) );//.nice();

    gyAxis
      .call(yAxis);

    gxAxis
      .call(xAxis);

    // plot heading
    var heading = gMain.selectAll(".line")
      .data(_map.entries());

    heading
      .enter().append("path")
      .attr("class", "line");
      
    heading
      .attr("d", function(d) {
        return line(d.value); 
      })
      //.style("stroke", function(d) { return color(d.key); })
      .style("stroke", function(d) { return colors.heading; })
        
    heading.exit().remove();
    ;

    // plot indicators
    var g_indicators = gMain.selectAll(".indicators")
      .data(_map_indicators.entries());

    g_indicators
      .enter().append("g")
      .attr("class", "indicators");
      
    g_indicators
      .on("click", function(d){
        addSelectionListener(d);
      })
      .each(function(_d,_i){
          
          var _indicators =  d3.select(this)
              .selectAll(".indicator")
              .data(_d.value);

          // UPDATE EXISTING
         
          // ADD NEW - ENTER
            _indicators
              .enter()
              .append("path")
              .classed("indicator", true)
              .attr("d", function(d){
                return indicator(d.strength);
              })
              .style("fill", function(d) { return colors.indicator; })
              .style("opacity",0);

          // ENTER + UPDATE
          _indicators
            .attr('transform', function(d,i){
              return "translate("+x(d.degree)+","+y(d.date)+")rotate("+ ( _i%2 ? -90 : 90 ) +")";
            })
            .style("fill-opacity",0.75)
            .style("opacity",1);


          // REMOVE ANY
          _indicators
            .exit()
            .remove();

      });

    var legend_data = _map.entries().concat(_map_indicators.entries());
    // 1st key is heading and rest are indicators
    
    var legends = legend.selectAll("g")
      .data(legend_data);

    // update existing
    
    // enter 
    var _legends = legends
      .enter().append("g")
      .classed("legend",true)
      .attr("transform", function(d,i) {
        return "translate(0,"+ (i+1)*15 +")";
      })
      .on("click", function(d,i){
        addSelectionListener(d);
      });

    // append symbol
    _legends.append("path");

    // append text
    _legends.append("text");

    // attach symbol
    _legends.select("path")
      .attr("d",function(d,i){
        if (i===0) {
          return "M-5,0L5,0";
        }else{
          return d3.svg.symbol().type('triangle-up').size(40)(10);
        };
      })
      .style("fill", function(d,i){
        return colors.indicator;
      })
      .style("stroke",function(d,i){
        if (i===0) {
          return colors.heading;
        }else{
          return "none";
        };
      })
      .attr("transform",function(d,i){
        if (i===0) {
          return "translate(5,-5)"
        };
        return "translate(5,-5)rotate("+ (i%2?90:-90) +")";
      });

     // enter + update
    _legends.select("text")
      .attr("transform","translate(15,0)")
      .text(function(d,i){
        return d.key;
      });

    // remove
    legends.exit().remove();

    /*
    var city = svg.selectAll(".city")
      .data(_map.entries());

    city
      .enter().append("g")
      .attr("class", "city")
      
    city
      .append("path")
      .classed("line", true)
      .attr("d", function(d) { return line(d.value); })
        .style("stroke", function(d) { return color(d.key); })
        
    city.exit().remove();
    */

  };

//});


  function addHeading(time, bearing) {
    
    var data = {
        name: 'Heading',
        time: new Date(time),
        value: bearing
    };

    update_dataset(data, true);

    update();

  };

  function addDetection(time, seriesName, bearing, strength){
    
    var data = {
        name: seriesName,
        time: new Date(time),
        value: bearing,
        strength: strength
    };

    update_dataset(data,true);

    update();

  };

  function addSelectionListener( listener ) {
    setSource(listener);
  };

  function setSource (listener) {
    console.log(listener);
  };

  function clear(){
    _map = d3.map([]);
    _map_indicators = d3.map([]);
  };

  $("#btn_data_updation_interval").on("click", function(e){
    // clear interval
    active_timers.forEach(function(t){
      clearInterval(t);
    });
    active_timers = [];
    data_updation_interval = +$("#data_updation_interval").val();
    setDataUpdateRoutine();
  });
  setDataUpdateRoutine();


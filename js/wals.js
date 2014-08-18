//############### check for window width #########

if (window.innerWidth < 1200)  {
        $("#warningbox").css("display","block");
};

window.onresize = function(event) {

	if (window.innerWidth < 1200)  {
	        $("#warningbox").css("display","block");
	}
	else{
		$("#warningbox").css("display","none");
	}

}



//############### global variables ###############

var radSmall = 2.5;
var radFocus = 6;
var scaleFactor = 1;
var ew = 0, ns = 0;
var families;
var langByValue;
var langByGenFamily;
var codeByLang;
var featureByName = {};
var selLanguages = [];
var catSelection = [];
var allLanguages = [];
var zoompan = false;
var radius;
var fam;
var featureSet = {};
var groupScale;

//############### projection settings ###############
var margin = {top: 10, left: 10, bottom: 80, right: 10}
  , width = parseInt(d3.select('#map').style('width'));

if(width > 580){ width = 580;}

var width = width - margin.left - margin.right
  , mapRatio = .9
  , height = width * mapRatio - margin.bottom;


var projection = d3.geo.mercator() 
	.scale(width/8)
    .translate([width / 2 , height / 2])
	.center([0,50])
	.rotate([-162.5,0])
	//.scale(mapscale) //.scale(mapscale)
	//.translate([290,171])
	;


$('#mapcontainer').css("height",function(){return height + 120;});

//############### make basic plot ###############
var svg = d3.select("#map").append("svg") 
	.attr("width", width)
	.attr("height", height)
	.style('cursor',"crosshair")
	;
var g = svg.append("g");
var mapPoly = g.append('g').attr('class','mapPoly')
var edgeArcs = g.append('g').attr('class','edgeArcs'); 
var overall = g.append('g').attr('class','overAll');

// define scales and projections 
var path = d3.geo.path()
	.projection(projection);
var weightScale = d3.scale.linear()
	.domain([0,2,4,6,8]) 
	.range(['blue','green','yellow','orange','red']);
	
// load and display the World
d3.json("world-110m.json", function(error, topology) { 
	var countrydata = topojson.object(topology,topology.objects.countries).geometries;          
	mapPoly.selectAll("path")
		.data(topojson.object(topology, topology.objects.countries) 
		.geometries) 
		.enter() 
		.append("path")
		.attr("d", path) 
		.style("fill",function(d){
			return "#f0f0f0";
		 })
		.style('stroke','#ccc')
		.style('stroke-width',function(d){
			return 1/scaleFactor;
		})
		; 
});

//############### brushing ###############

var x = d3.scale.linear()
 .range([0, width])
 //.domain([-180,180])
 .domain([0, width])
 ;

var y = d3.scale.linear()
	.range([height, 0])
	//.domain([-90,90])
	.domain([height, 0])
	;

var brush = d3.svg.brush()
	.x(x)
	.y(y)
	.on("brush", brushed)
	;
	
function brushed2(){
		if(brush.empty()){
			selLanguages = catSelection;
		}
		else{
			
			var e = brush.extent();
			
			  selLanguages = [];
			  d3.selectAll(".location").classed('brushhidden',function(d){
					//console.log(d);
					//return false;
					if( e[0][0] > projection([d.longitude,d.latitude])[0] 
								|| projection([d.longitude,d.latitude])[0] > e[1][0]
						|| e[0][1] > projection([d.longitude,d.latitude])[1] 
								|| projection([d.longitude,d.latitude])[1] > e[1][1]){
						
						return true;
					}
					else{
						if(featureSet[d.value.split(',')[0]] == 1){
							selLanguages.push(d);
						}
						return false;
					}
			  });			  
		}
}

function brushed(p) {
  //console.log(brush.extent());
  
  var e = brush.extent();
  if(brush.empty()){
	d3.selectAll(".location").classed('brushhidden', false);
	selLanguages = catSelection;
	d3.select('#sunburst svg').remove();
	sunburst(selLanguages);
  }
  else{
	  selLanguages = [];
	  d3.selectAll(".location").classed('brushhidden',function(d){
			//console.log(d);
			//return false;
			if( e[0][0] > projection([d.longitude,d.latitude])[0] 
						|| projection([d.longitude,d.latitude])[0] > e[1][0]
				|| e[0][1] > projection([d.longitude,d.latitude])[1] 
						|| projection([d.longitude,d.latitude])[1] > e[1][1]){
				
				return true;
			}
			else{
				if(featureSet[d.value.split(',')[0]] == 1){
					selLanguages.push(d);
				}
				return false;
			}
	  });
	  d3.select('#sunburst svg').remove();
	  sunburst(selLanguages);
  }

}


//############### get information about features for drowdown menu ###############
d3.tsv('wals_data/features.tab').get(function (err, results){

	var select = document.getElementById("features");  
	results.forEach(function(a){
		featureByName[a.id] = a.name;
		var el = document.createElement("option");
		el.textContent = a.id + ": " + a.name;
		el.value = a.id;
		select.appendChild(el);
	});
	loaddata('1A');
	//console.log(featureByName);

	// enable select picker
	$('.selectpicker').selectpicker({
      style: 'btn-default btn-sm',
      size: 20,
      width: width//'auto'
  	});
});


//############### load data ###############
function loaddata(feature){
// load data 
	//console.log(url);

	d3.select("#legendname").text(feature);
	d3.select("#legendlink").attr('href',"http://wals.info/feature/" + feature);
	
	var nodeCircles = g.append('g').attr('class','nodeCircles');
	langByValue = {};
	codeByLang = {};
	walsByInfo = {};
	
	d3.selection.prototype.moveToFront = function() {
	  return this.each(function(){
	  this.parentNode.appendChild(this);
	  });
	};

	// get feature values from feature file
	d3.xhr('wals_data/features/' + feature + '.tab').get(function (err, response) {
		var dirtyCSV = response.responseText;
		var cleanCSV = dirtyCSV.split('\n').slice(7).join('\n');
		var parsedCSV = d3.tsv.parse(cleanCSV);
		

		allLanguages = parsedCSV;
		catSelection = allLanguages;
		
		var allValues = parsedCSV.map(function(d) { return d.value; });
		var uniquevalues = d3.set(allValues).values().sort();

		// legend names 
		var dataset = parsedCSV.map(function(d) { return [d.value,d.description]; });
		var unis = d3.set(dataset).values().sort();
		var featurenames = [];
		unis.forEach(function(a){
			featureSet[a.split(',')[0]] = 1;
			featurenames.push(a.split(',')[1]);
		})
		console.log(featurenames);

		// determine color scale
		if(featurenames.indexOf("Small") != -1 || featurenames.indexOf("1") != -1 ||
			featurenames.indexOf("Two") != -1 || featurenames.indexOf("2 cases") != -1){
			groupScale = d3.scale.ordinal()
				.range(colorbrewer.OrRd[featurenames.length]);
			console.log("ordinal");
		}
		else{
			groupScale = uniquevalues.length > 10 ? d3.scale.category20() : d3.scale.category10();
		}
		//console.log(uniquevalues);
		
		//############### plot locations ###############
		nodeCircles.selectAll("path")
			.data(parsedCSV)
			.enter()
			.append("circle")
			.attr('class',function(d){
				walsByInfo[d['wals code']] = d['name'] + " [" + d['wals code'] + "] " 
					+ d['family'] 
					+ ", " + d['genus'] + "";
				return 'location loc_' + d['wals code'] + 
					" loc_gen_" + d['genus'].replace(/[-\s]/g,'_') + " loc_fam_" + d['family'].replace(/[-\s]/g,'_');
			})
			.attr('cx',function(d){
				return projection([d.longitude, d.latitude])[0];	
			})
			.attr('cy', function(d){
				return projection([d.longitude, d.latitude])[1];
			})
			.attr('r', function(d){
				return radSmall/scaleFactor;
			})
			.style("fill", function(d){
				langByValue[d['wals code']] = d.value;
				codeByLang[d['wals code']] = d.name;
				return groupScale(d.value);
			})
			.style("stroke","black")
			.style("stroke-width", function(){ return 0.2/scaleFactor;})
			.style("cursor","pointer") 
			.on("mouseover",function(d){
				

				d3.select("#mapinfo").text(walsByInfo[d['wals code']]);

				$("#mapinfo").css("color",function(){
					return groupScale(d.value);
				});


				// sunburst interaction
				dname = d['wals code'];
				if(dname in langByFam){
					d3.selectAll('.sun_fam_' + langByFam[dname].replace(/[-\s]/g,'_'))
							.style('fill','#444')
						;
				}
				if(dname in langByGen){
					d3.selectAll('.sun_gen_' + langByGen[dname].replace(/[-\s]/g,'_'))
							.style('fill','#444')
						;
				}
				if(dname.length == 3){
					d3.selectAll('.sun_' + dname)
						.style("fill",'#444');
				}

				d3.select("#sunburstinfo")
					.text(walsByInfo[dname])
					;

				$("#sunburstinfo")
					.css("color",function(){
						return d.children ? "#444" : groupScale(langByValue[dname]);
					});
					
				
			})
			.on("mouseout",function(d){
				

				d3.select("#mapinfo").html('&nbsp;');

				d3.selectAll('.sun')
					.style('fill',function(e){
						return e.children ? '#ccc' : groupScale(langByValue[e.name]);
					})
				;

				d3.select("#sunburstinfo").html("&nbsp;");
			})
			;

		// get selection from brush

		brushed2();
		
			
		//############### legend ###############
		legend = d3.select("#legend").append("svg") 
			.attr("width", 450)
			.attr("height", 606)
			.append('g')
			.attr('class','legendbox')
			;
		


		// resize the legend widget
		$("#legendbody").css("height",function(){ 
			var legheight = unis.length * 25;
			//console.log(legheight);
			return legheight;
		});
		
		legend.selectAll('legcircle')
			.data(unis)
			.enter()
			.append("circle")
			.attr("cx",20)
			.attr("cy",function(d,i){ return 20 + i * 20;})
			.style("stroke","black")
			.style("stroke-width",0.5)
			.attr("r",8)
			.style("fill",function(d){return groupScale(d.split(',')[0]);})
			.style('cursor','pointer')
			.on('click',function(d){

				currfeat = d.split(',')[0];

				// remove feature
				if(featureSet[currfeat]){
					d3.select(this)
					.style("fill","white")
					.style("stroke",function(d){
						return groupScale(d.split(',')[0]);
					})
					.style("stroke-width",2)
					;

					featureSet[currfeat] = 0;

					relFeatures = {};
					for(f in featureSet){
						if(featureSet[f] == 1){
							relFeatures[f] = 1;
						}
					}
					selLanguages = allLanguages.filter(function(e){ 
						//console.log(e.value,relFeatures);
						return e.value in relFeatures; 
					})

					d3.selectAll('.location')
						//.data(selLanguages)
						//.update()
						.classed("invisible",function(d){
							return featureSet[d.value.split(',')[0]] == 0;
						})
					;

					catSelection = selLanguages;
					

					d3.select('#sunburst svg').remove();
					brushed2();
					sunburst(selLanguages);

				}

				// activate feature
				else{
					d3.select(this)
					.style("fill",function(d){
						return groupScale(d.split(',')[0]);
					})
					.style("stroke","black")
					.style("stroke-width",0.5)	
					;
					featureSet[currfeat] = 1;

					relFeatures = {};
					for(f in featureSet){
						if(featureSet[f] == 1){
							relFeatures[f] = 1;
						}
					}
					addLanguages = allLanguages.filter(function(e){ 
						//console.log(e.value,relFeatures);
						return e.value == currfeat; 
					})
					selLanguages = selLanguages.concat(addLanguages);

					catSelection = selLanguages;

					d3.selectAll('.location')
						//.data(selLanguages)
						//.update()
						.classed("invisible",function(d){
							return featureSet[d.value.split(',')[0]] == 0;
						})
					;

					d3.select('#sunburst svg').remove();
					brushed2();
					sunburst(selLanguages);

				}
			})
			;

		legend.selectAll("legtext") 
			.data(unis) 
			.enter() 
			.append("svg:text") 
			.attr("x",35)
			.attr("y",function(d,i){return 24 + i * 20;}) 
			.style("font-size",11)
			.style("font-family","Helvectica,Arial,Verdana,sans-serif") 
			.text(function(d){return d.split(',')[1];}) 
			;
			
		
		sunburst(selLanguages);

	});
	


};

overall.append("g").attr("class","brush").call(brush);

function sunburst(languagedata){
		
		//############### construct genealogy ###############
		families = {};
		langByFam = {};
		langByGen = {};
		genByFam = {};
		upperByLower = {};
		fam = {};
		languagedata.forEach(function(d){
			//console.log(d);
			//langByGenFamily[d['wals code']] = [d.family,d.genus];
			d.family in upperByLower ? upperByLower[d.family].push(d.genus) : upperByLower[d.family] = [d.genus];
			d.genus in upperByLower ? upperByLower[d.genus].push(d['wals code']) : upperByLower[d.genus] = [d['wals code']];

			langByGen[d['wals code']] = d.genus;
			langByFam[d['wals code']] = d.family;
			genByFam[d.genus] = d.family;
			if(families[d.family]){
				if(families[d.family][d.genus]){
					families[d.family][d.genus].push(d['wals code']);
				}
				// add genus to family
				else{
					
					families[d.family][d.genus] = [];
					families[d.family][d.genus].push(d['wals code']);
				}
			}
			// add family
			else{
				families[d.family] = {};
				families[d.family][d.genus] = [];
				families[d.family][d.genus].push(d['wals code']);
			}
		});
		//console.log(families);
		
		fam['name'] = 'root'
		fam['children'] = [];
		for(var famkey in families){
			var newFam = {};
			newFam['name'] = 'fam_' + famkey;
			newFam['children'] = [];
			for(var genkey in families[famkey]){
				var newGen = {};
				newGen['name'] = 'gen_' + genkey;
				var childrenGen = [];
				for(var i=0;i<families[famkey][genkey].length;i++){
					var newLang = {};
					newLang['name'] = families[famkey][genkey][i];
					newLang['size'] = 1;
					childrenGen.push(newLang);
				}
				newGen['children'] = childrenGen;
				newFam['children'].push(newGen);
			}
			fam['children'].push(newFam);
		}
		
		//console.log(fam);
		
		//############# CONSTRUCT SUNBURST #############
		
		//var width = 550,
	    height = width,
	    radius = Math.min(width-30, height-30) / 2;

	    $('#sunburstcontainer').css("height",function(){return height + 150;});

		var xscale = d3.scale.linear()
		    .range([0, 2 * Math.PI]);

		var yscale = d3.scale.sqrt()
		    .range([0, radius]);

		var color = d3.scale.category20c();

		var svg = d3.select("#sunburst").append("svg")
		    .attr("width", width)
		    .attr("height", height)
		  	.append("g")
		    .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

		var partition = d3.layout.partition()
		    .value(function(d) { return 1; });


		var arc = d3.svg.arc()
		    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, xscale(d.x))); })
		    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, xscale(d.x + d.dx))); })
		    .innerRadius(function(d) { return Math.max(0, yscale(d.y)); })
		    .outerRadius(function(d) { return Math.max(0, yscale(d.y + d.dy)); });


		  var path = svg.datum(fam).selectAll("path")
		      .data(partition.nodes)
		    .enter().append("path")
		      .attr("d", arc)
			  .attr('class',function(d){ 
				  //console.log(d);
					return "sun sun_" + d.name.replace(/[-\s]/g,'_');
				  
			  })
		      .style("cursor","pointer")
			  .style("stroke", "#fff")
		      .style("fill", function(d) { 
		      	//return color((d.children ? d : d.parent).name); 
		      	return d.name == "root" ? "#999" : d.children ? "#ccc" : groupScale(langByValue[d.name]);
		      })
			  .style("fill-rule", "evenodd")
			  .on('mouseover',function(d){
				//console.log(d);
				d3.selectAll('.location').classed('hidden',true);
			  
				d3.selectAll(".loc_" + d.name.replace(/[-\s]/g,'_'))
					.attr('r',function(){
						return radSmall/scaleFactor;
					})
					.style("stroke-width",function(){
						return 0.2/scaleFactor;
					})
					.classed('hidden',false)
					;
					
				var sel = d3.select(".loc_" + d.name.replace(/[-\s]/g,'_'));
				sel.moveToFront();
				
				
				if(d.name.length == 3){
					outname = walsByInfo[d.name];
				}
				else{
					outname = d.name.substring(4);
				}

				d3.selectAll('.sun_' + d.name.replace(/[-\s]/g,'_'))
					.style('fill',function(d){
						return d.children ? '#444' : groupScale(langByValue[d.name]);
					})
					;

				//console.log(d.name,langByFam[d.name],langByGen[d.name],genByFam[d.name]);
				if(d.name in langByFam){
					d3.selectAll('.sun_fam_' + langByFam[d.name].replace(/[-\s]/g,'_'))
							.style('fill','#444')
						;
				}
				if(d.name in langByGen){
					d3.selectAll('.sun_gen_' + langByGen[d.name].replace(/[-\s]/g,'_'))
							.style('fill','#444')
						;
				}
				if(outname in genByFam){
					d3.selectAll('.sun_fam_' + genByFam[outname].replace(/[-\s]/g,'_'))
							.style('fill','#444')
						;
				}


				// sunburst info box
				
				d3.select("#sunburstinfo")
					.text(outname)
					;

				$("#sunburstinfo")
					.css("color",function(){
						return d.children ? "#444" : groupScale(langByValue[d.name]);
					});

				d3.select("#mapinfo")
					.text(outname)
					;

				$("#mapinfo")
					.css("color",function(){
						return d.children ? "#444" : groupScale(langByValue[d.name]);
					});

				
			  })
			  .on('mouseout',function(d){
				d3.selectAll(".location")
					.attr('r',function(){
						return radSmall/scaleFactor;
					})
					.style("stroke-width",function(){
						return 0.2/scaleFactor;
					})
					;
					
				d3.selectAll('.location').classed('hidden',false);
					
				
				d3.selectAll('.sun')
					.style('fill',function(d){
						return d.name == "root" ? "#999" : d.children ? "#ccc" : groupScale(langByValue[d.name]);
					})
				;

				d3.select("#sunburstinfo")
					.html("&nbsp;");

				d3.select("#mapinfo")
					.html("&nbsp;");
				
			  })
		      .on("click", click)
		      ;

		  function click(d) {
		    path.transition()
		      .duration(750)
		      .attrTween("d", arcTween(d));
		  }



		// Interpolate the scales!
		function arcTween(d) {
		  var xd = d3.interpolate(xscale.domain(), [d.x, d.x + d.dx]),
		      yd = d3.interpolate(yscale.domain(), [d.y, 1]),
		      yr = d3.interpolate(yscale.range(), [d.y ? 20 : 0, radius]);
		  return function(d, i) {
		    return i
		        ? function(t) { return arc(d); }
		        : function(t) { xscale.domain(xd(t)); yscale.domain(yd(t)).range(yr(t)); return arc(d); };
		  };
		}
		  
				  
};



//############### listener to feature selection ###############
//d3.select('#features').on('change',function(){
	$('.selectpicker').on('change',function(){
	feature = this.value;
	d3.select('.nodeCircles').remove();
	d3.select('#legend svg').remove();
	d3.select('#sunburst svg').remove();
	loaddata(feature);
})
;

function updateSelection(){


}

function redrawMap(){
	g.transition()
		.duration(750)
		.attr("transform","translate(" + ew + "," + ns + ")scale("+scaleFactor+")");
            

    g.selectAll("circle")
        .attr("d", path.projection(projection))
        .attr("r",function(d){
            return radSmall/scaleFactor;
        })
        .style('stroke-width',function(d){
            return 0.2/scaleFactor;
        })
    ;
    
    g.selectAll("path")  
        .attr("d", path.projection(projection))
        .style('stroke-width',function(d){
            return 1/scaleFactor;
        }); 
    
}




function moveMap(ew,ns){
	g.attr("transform","translate(" + ew + "," + ns + ")scale(1)");
	//g.attr("transform","translate(-100,0)scale(1)");
}

 d3.select("#bigger").on('click',function(){
 	scaleFactor <= 4.9 ? scaleFactor += 0.8 : scaleFactor = 5;
	            redrawMap();
	             
 })
 ;

  d3.select("#smaller").on('click',function(){
 	scaleFactor >= 1.1 ? scaleFactor -= 0.8 : scaleFactor = 1;
	            redrawMap();
	             
 })
 ;

  d3.select("#west").on('click',function(){
  		ew += 100;
 		redrawMap();         
 })
 ;

   d3.select("#east").on('click',function(){
 		ew -= 100;
 		redrawMap();         
 })
 ;

   d3.select("#north").on('click',function(){
 		ns += 100;
 		redrawMap();         
 })
 ;

   d3.select("#south").on('click',function(){
 		ns -= 100;
 		redrawMap();         
 })
 ;

    d3.select("#biggerDots").on('click',function(){
 		radSmall += 0.5;
 		redrawMap();         
 })
 ;

     d3.select("#smallerDots").on('click',function(){
 		radSmall -= 0.5;
 		redrawMap();         
 })
 ;

d3.select('#resetmap').on('click',function(a){
	radSmall = 2.5;
 g.transition()
 .duration(750)
 .attr('transform','translate(0,0)');
 scaleFactor = 1;
 ew = 0, ns = 0;
 g.selectAll("circle")
                 .attr("d", path.projection(projection))
                 .attr("r",function(d){
                     return radSmall/scaleFactor;
                 })
                 .style('stroke-width',function(d){
                     return 0.2/scaleFactor;
                 })
             ;
 g.selectAll("path")  
     .attr("d", path.projection(projection))
     .style('stroke-width',function(d){
         return 1/scaleFactor;
     }); 
     
     
 
  
});






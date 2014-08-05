
//############### global variables ###############
var width = 580, height = 370; 
var radSmall = 3;
var radFocus = 6;
var scaleFactor = 1;
var ew = 0, ns = 0;
var families;
var langByValue;
var langByGenFamily;
var codeByLang;
var featureByName = {};
var selLanguages = [];
var allLanguages = [];
var zoompan = false;

//############### projection settings ###############
var projection = d3.geo.mercator() 
	.center([0,50])
	.rotate([-162.5,0])
	.scale(90)
	.translate([290,171])
	;



	
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
var groupScale = d3.scale.category10();
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
			selLanguages = allLanguages;
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
						selLanguages.push(d);
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
	selLanguages = allLanguages;
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
				selLanguages.push(d);
				return false;
			}
	  });
	  d3.select('#sunburst svg').remove();
	  sunburst(selLanguages);
  }

}


      d3.select('#resetmap').on('click',function(a){
         g.attr('transform','translate(0,0)');
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
             
             zoom.scale(1);
             zoom.translate([0,0]);
         
          
      });





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
		
		var allValues = parsedCSV.map(function(d) { return d.value; });
		var uniquevalues = d3.set(allValues).values().sort();
		groupScale = uniquevalues.length > 10 ? d3.scale.category20() : d3.scale.category10();
		//console.log(parsedCSV);
		
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
					" loc_gen_" + d['genus'].replace(/\s/g,'_') + " loc_fam_" + d['family'].replace(/\s/g,'_');
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
					d3.selectAll('.sun_fam_' + langByFam[dname].replace(/\s/g,'_'))
							.style('fill','#444')
						;
				}
				if(dname in langByGen){
					d3.selectAll('.sun_gen_' + langByGen[dname].replace(/\s/g,'_'))
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
			/*
			.append("title") 
			.text(function(d){ 
				return d.name; 
			})
			*/
			;

		// get selection from brush
		/*
		if(brush.empty()){
			selLanguages = parsedCSV;
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
						selLanguages.push(d);
						return false;
					}
			  });			  
		}
			
		*/
		brushed2();
		
			
		//############### legend ###############
		legend = d3.select("#legend").append("svg") 
			.attr("width", 450)
			.attr("height", 606)
			.append('g')
			.attr('class','legendbox')
			;
		
		// legend names 
		var dataset = parsedCSV.map(function(d) { return [d.value,d.description]; });
		var unis = d3.set(dataset).values().sort();
		//console.log(unis);
		
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
			.on('mouseover',function(d){
				d3.selectAll('.location')
					.classed('hidden',function(n){
						//console.log(d,n);
						return d.split(',')[0] != n.value;
					})


				  selLanguages = [];
				  parsedCSV.forEach(function(item){
				  	currCat = d.split(',')[0];
				  	if(currCat == item.value){
				  		selLanguages.push(item);
				  	}
				  });

				  d3.select('#sunburst svg').remove();
				  sunburst(selLanguages);
			})
			.on('mouseout',function(d){
				d3.selectAll('.location')
					.classed('hidden',false);

					//selLanguages = allLanguages;
					d3.select('#sunburst svg').remove();
					brushed2();
					sunburst(selLanguages);

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
			.style('cursor','pointer')
			.on('mouseover',function(d){
				d3.selectAll('.location')
					.classed('hidden',function(n){
						//console.log(d,n);
						return d.split(',')[0] != n.value;
					})

				selLanguages = [];
				  parsedCSV.forEach(function(item){
				  	currCat = d.split(',')[0];
				  	if(currCat == item.value){
				  		selLanguages.push(item);
				  	}
				  });

				  d3.select('#sunburst svg').remove();
				  sunburst(selLanguages);
			})
			.on('mouseout',function(d){
				d3.selectAll('.location')
					.classed('hidden',false);

				d3.select('#sunburst svg').remove();
				brushed2();
				sunburst(selLanguages);
			})
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
		upperByLower = {};
		var fam = {};
		languagedata.forEach(function(d){
			//console.log(d);
			//langByGenFamily[d['wals code']] = [d.family,d.genus];
			d.family in upperByLower ? upperByLower[d.family].push(d.genus) : upperByLower[d.family] = [d.genus];
			d.genus in upperByLower ? upperByLower[d.genus].push(d['wals code']) : upperByLower[d.genus] = [d['wals code']];

			langByGen[d['wals code']] = d.genus;
			langByFam[d['wals code']] = d.family;
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
		
		var width = 550,
		height = 550,
		radius = Math.min(width-50, height-50) / 2;
		
		var svg = d3.select("#sunburst").append("svg")
			.attr("width", width)
			.attr("height", height)
			.append("g")
			.attr("transform", "translate(" + width / 2 + "," + height * .52 + ")");
		
		var partition = d3.layout.partition()
			.sort(null)
			.size([2 * Math.PI, radius * radius])
			.value(function(d) { return 1; });
		
		var arc = d3.svg.arc()
			.startAngle(function(d) { return d.x; })
			.endAngle(function(d) { return d.x + d.dx; })
			.innerRadius(function(d) { return Math.sqrt(d.y); })
			.outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });
		
			  
			var g = svg.datum(fam).selectAll("g")
			  .data(partition.nodes)
			  .enter().append("svg:g")
			  .attr("display", function(d) { return d.depth ? null : "none"; }) // hide inner ring
			  ;
			  
			  g.append('svg:path')
				  .attr('class',function(d){ 
					  //console.log(d);
						return "sun sun_" + d.name.replace(/\s/g,'_');
					  
				  })
				  .attr("d", arc)
				  .style("stroke", "#fff")
				  .style("fill", function(d) { 
					//return color((d.children ? d : d.parent).name); 
					return d.children ? "#ccc" : groupScale(langByValue[d.name]);
				  })
				  .style("fill-rule", "evenodd")
				  .style('cursor','pointer')
				  .on('mouseover',function(d){
					//console.log(d);
					d3.selectAll('.location').classed('hidden',true);
				  
					d3.selectAll(".loc_" + d.name.replace(/\s/g,'_'))
						.attr('r',function(){
							return radSmall/scaleFactor;
						})
						.style("stroke-width",function(){
							return 0.2/scaleFactor;
						})
						.classed('hidden',false)
						;
						
					var sel = d3.select(".loc_" + d.name);
					sel.moveToFront();
					
					d3.selectAll('.sunlabel').classed('hidden',true);
					
					
					d3.selectAll('.sunlabel_' + d.name.replace(/\s/g,'_'))
						.style("font-size",13)
						.classed('hidden',false)
					;
					
					d3.selectAll('.sun_' + d.name.replace(/\s/g,'_'))
						.style('fill',function(d){
							return d.children ? '#444' : groupScale(langByValue[d.name]);
						})
						;

					//console.log(d.name,langByFam[d.name],langByGen[d.name]);
					if(d.name in langByFam){
						d3.selectAll('.sun_fam_' + langByFam[d.name].replace(/\s/g,'_'))
								.style('fill','#444')
							;
					}
					if(d.name in langByGen){
						d3.selectAll('.sun_gen_' + langByGen[d.name].replace(/\s/g,'_'))
								.style('fill','#444')
							;
					}


					// sunburst info box
					if(d.name.length == 3){
						outname = walsByInfo[d.name];
					}
					else{
						outname = d.name.substring(4);
					}
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
						
					d3.selectAll('.sunlabel_' + d.name.replace(/\s/g,'_'))
						.style("font-size",6)
						;
						
					d3.selectAll('.sunlabel').classed('hidden',false);
					
					d3.selectAll('.sun')
						.style('fill',function(d){
							return d.children ? '#ccc' : groupScale(langByValue[d.name]);
						})
					;

					d3.select("#sunburstinfo")
						.html("&nbsp;");

					d3.select("#mapinfo")
						.html("&nbsp;");
					
				  })
				  /*
				  .append('title')
				  .text(function(d){
				  	
					var outputname =  d.name.split('_');
					return outputname[outputname.length-1];
				  })
				  */
				  ;

				  
				  
};



//############### listener to feature selection ###############
d3.select('#features').on('change',function(){
	feature = this.value;
	d3.select('.nodeCircles').remove();
	d3.select('#legend svg').remove();
	d3.select('#sunburst svg').remove();
	loaddata(feature);
})
;

function redrawMap(){
	g.attr("transform","translate(" + ew + "," + ns + ")scale("+scaleFactor+")");
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

function rescaleMap(){
	g.attr("transform","translate(0,0)scale("+scaleFactor+")");
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
  		ew -= 100/scaleFactor;
 		redrawMap();         
 })
 ;

   d3.select("#east").on('click',function(){
 		ew += 100/scaleFactor;
 		redrawMap();         
 })
 ;

   d3.select("#north").on('click',function(){
 		ns -= 100/scaleFactor;
 		redrawMap();         
 })
 ;

   d3.select("#south").on('click',function(){
 		ns += 100/scaleFactor;
 		redrawMap();         
 })
 ;



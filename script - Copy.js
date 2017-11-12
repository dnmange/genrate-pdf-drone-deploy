$("#generate-pdf").on("click",function(){
    getMapData();
});

/*Get tile data from currently viewed map*/
function getMapData(){
	new DroneDeploy({version: 1}).then(function(dronedeploy){
		dronedeploy.Plans.getCurrentlyViewed().then(function(plan){
		var zoom = 18;
		dronedeploy.Tiles.get({planId: plan.id, layerName: 'ortho', zoom: zoom})
		  .then(function(res){
		    return getTilesFromGeometry(plan.geometry, res.template, zoom);
		    /*tileList.innerHTML = tiles.slice(0, 4).map((tileUrl) => {
		      return '<div style="display: flex; flex: 25;"><img src="'+tileUrl+'"></img></div>'
		    }).join('')*/
		  })
		  .then(function(tiles){
		  	const url = 'https://drone-deploy-app.herokuapp.com/getTiles';
		  	//const url = 'localhost:5000/getTiles';
		    const data = JSON.stringify(tiles);
		    //console.log(callAjaxPost(tiles,url));
		    return fetch(url, {
		        method: 'POST',
		        headers: new Headers({
		            'Content-Type': 'application/json'
		        }),
		        body: data
		    })
		    .then(function (res) {
		        return res.json();
		    })
		    .then(generatePdf); 
		  });
		});
	});
}

/*Get tiles as Array*/
function getTilesFromGeometry(geometry, template, zoom){
  function long2tile(lon,zoom) {
    return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
  }
  function lat2tile(lat,zoom) {
    return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
  }
  function replaceInTemplate(point){
    return template.replace('{z}', point.z)
      .replace('{x}', point.x)
      .replace('{y}', point.y);
  }

  var allLat = geometry.map(function(point){
    return point.lat;
  });
  var allLng = geometry.map(function(point){
    return point.lng;
  });
  var minLat = Math.min.apply(null, allLat);
  var maxLat = Math.max.apply(null, allLat);
  var minLng = Math.min.apply(null, allLng);
  var maxLng = Math.max.apply(null, allLng);
  var top_tile    = lat2tile(maxLat, zoom); // eg.lat2tile(34.422, 9);
  var left_tile   = long2tile(minLng, zoom);
  var bottom_tile = lat2tile(minLat, zoom);
  var right_tile  = long2tile(maxLng, zoom);
  
  var tiles = [];
  for (var y = top_tile; y < bottom_tile + 1; y++) {
    for (var x = left_tile; x < right_tile + 1; x++) {
      tiles.push(replaceInTemplate({x, y, z: zoom}))
    }
  }

  return tiles;
}

/*Generate PDF using pdfMake*/
function generatePdf(titleContent) {
    const docDefinition = traverseTileArray(titleContent);
    pdfMake.createPdf(docDefinition).download();
}

/*Traverse tile array so as to generate the content for pdf*/
function traverseTileArray(titleContent) {
    var todaysDate = new Date(); 
    var dateTime = (todaysDate.getMonth()+1) + "/" + todaysDate.getDate() + "/" + todaysDate.getFullYear();
    var content = [{ text : 'DroneDeploy Pdf Generation', style : 'header' },{ text: dateTime, style: 'header' }];
    const styles = {
	    header: {
	      fontSize: 12,
	      bold: true
	    }
	}  
	for (let i = 0; i < titleContent.length; i++) {
		content.push({image: `data:image/jpeg;base64,${titleContent[i]}`});
	}
	return ({content : content, styles : styles});
}
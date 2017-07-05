//L.mapbox.accessToken = 'pk.eyJ1IjoibW9uaWNhbXMiLCJhIjoiNW4zbEtPRSJ9.9IfutzjZrHdm2ESZTmk8Sw';
//var map = L.mapbox.map('map', 'monicams.jpf4hpo5')
//	.setView([
//		0,
//		0], 2);

var map = L.map('map')
	//.setView([39.82, -98.58], 4);
	.setView([ 0,	0], 2);
var layer = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
}).addTo(map);

function onEachFeature(feature, layer) {
	//var count = feature.properties.count.toLocaleString();
	//layer.bindTooltip(count + " places").openTooltip();
	//layer.bindPopup(count);
}

function setKeyword()
{
	var filterQuery = jQuery('#keywordSearchText').val();
	solr.clearFilterQueries();
	solr.addFilterQuery(filterQuery);
	solr.refresh();
};


// Create and add a solrHeatmap layer to the map
//var solr = L.solrHeatmap('http://127.0.0.1:8983/solr/gettingstarted', {

function resetSolr()
{
	"use strict";

	var colorMap = jQuery('#colorMap').val().split(',');
	var placesData = [];

	if (solr) {
		map.removeLayer(solr);
	}

	var solrErrorHandler = function( jqXHR, textStatus, errorThrown ) {
		// due to jsonp, no details are available
		jQuery('#errorMessage').text('Solr error, bad URL or RPT field name');
	};

	var solrSuccessHandler = function( data, textStatus, jqXHR ) {
		var placeNames = [];
		placesData = [];
		for( var i=0, iEnd=data.response.docs.length; i<iEnd; i++) {
			placesData.push( data.response.docs[i] );
			data.response.docs[i].reverseName = data.response.docs[i]["n"].split(',').reverse().join(",");
		}

		//var nameSort = function(r,l) { return r.geonames_name.localeCompare(l.geonames_name); };
		var reverseNameSort = function( r, l ) { return r.reverseName.localeCompare(l.reverseName); };
		placesData.sort( reverseNameSort );

		for( i=0, iEnd=placesData.length; i<iEnd; i++ ) {
			//placeNames.push( "<option value='" + i + "'>" + placesData[i].reverseName + "  [" + placesData[i]["g"] + "]</option>" );
			placeNames.push( ["<option value='", i, "'>", placesData[i].reverseName, "  [",placesData[i]["g"],"]</option>"].join("") );
		}

		jQuery( '#placelist' ).html( placeNames.join(""));
		jQuery( '#errorMessage' ).text('');
		jQuery( '#responseTime' ).html('Solr response time: ' + solr.solrTime + ' ms');
		jQuery( '#numDocs' ).html('Number of docs: ' + solr.docsCount.toLocaleString());
	};

	var renderCompleteHandler = function() {

		if (solr.renderTime) {
			$('#renderTime').html('Render time: ' + solr.renderTime + ' ms');
		}
	};

	var keyword = jQuery('#keywordSearchText').val();

	solr = L.solrHeatmap( "http://localhost:8983/solr/locations", {

		field: "geo_rpt",

		type: "geojsonGrid",
		colors: colorMap,
		maxSampleSize: 400,

		solrErrorHandler: solrErrorHandler,
		solrSuccessHandler: solrSuccessHandler,
		renderCompleteHandler: renderCompleteHandler,

		popupHighlight: true,
		showGlobalResults: false,
		fixedOpacity: 100,
		filterQuery: keyword,

		limitFields: [
			'g:geo',
			'n:geonames_name',
			'i:id',
			'f:ox_totalWorksSentFromPlace',
			't:ox_totalWorksSentToPlace',
			'm:ox_totalWorksMentioningPlace'
		],
		maxDocs: 10000
	});
	solr.addTo(map);

	var markerHighlight = null;
	jQuery( '#placelist' ).on( "change", function () {
		var index = jQuery( '#placelist' ).val();
		var placeData = placesData[+index];

		var latlong = placeData["g"].split(",");
		if( markerHighlight === null ) {
			markerHighlight = L.popup({
				autoPan: false
			})
			.setLatLng( [ +latlong[0], +latlong[1] ] )
			.openOn( map );
		}

		var title = placeData["n"].split(",").slice(0,-1).join(", ");
		if( title.trim() === "" ) {
			title = placeData["n"];
		}
		var url = "http://emlo.bodleian.ox.ac.uk/profile/location/" + placeData["n"].replace("uuid_","");

		var content = "" +
			"<b>" + title + "</b><br/>" +
			((placeData["f"] !== 0)
				? "Sent from: " + placeData["f"] + " letters<br/>"
				: "") +
			((placeData["t"] !== 0)
				? "Sent to: " + placeData["t"] + " letters<br/>"
				: "") +
			((placeData["m"] !== 0)
				? "Mentioned: " + placeData["m"] + " letters<br/>"
				: "")  +
			'<a href="' + url + '" target="_blank">Link to main record</a>';

		markerHighlight
			.setLatLng( [ +latlong[0], +latlong[1] ] )
			.setContent( content );

	});
}

var solr = null;

resetSolr();
var map = L.map('map').setView([39.82, -98.58], 4); //.setView([ 0,	0], 2);

var layer = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
}).addTo(map);

function onEachFeature(feature, layer) {
	var count = feature.properties.count.toLocaleString();
	layer.bindTooltip(count + " places").openTooltip();
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
	"strict mode";

	var solrUrl = jQuery('#solrUrl').val();
	var renderType = jQuery("#renderType option:selected" ).text();
	var rptField = jQuery('#rptField').val();
	var colorMap = jQuery('#colorMap').val();
	var nearbyField = '';
	var nearbyFieldType = '';
	var popupDisplayField = '';
	var sortField = '';
	var showGlobalResults = false;

	var placesData = [];

	if (popupDisplayField.indexOf(',') > -1)
		popupDisplayField = popupDisplayField.split(',');
	else
		popupDisplayField = [popupDisplayField];

	colorMap = colorMap.split(',');

	if (solr)
		map.removeLayer(solr);

	// if the doi field is present, we format it as an html link to the jstor document
	// first, a function to generate the html
	var doiLinker = function(doc)
	{
		value = doc['doi'];
		if (Array.isArray(value))
			value = value.join();
		return "<a target='_blank' href='http://www.jstor.org/stable/" + value + "'>" + value + "</a>.  ";
	};
	doiIndex = popupDisplayField.indexOf('doi');
	if (doiIndex > -1 )
		popupDisplayField[doiIndex] = ['doi', function(doc) {return doiLinker(doc);}];

	var solrErrorHandler = function(jqXHR, textStatus, errorThrown)
	{
		// due to jsonp, no details are available
		jQuery('#errorMessage').text('Solr error, bad URL or RPT field name');
	};

	var solrNearbyErrorHandler = function(jqXHR, textStatus, errorThrown)
	{
		// due to jsonp, no details are available
		jQuery('#errorMessage').text('Solr error, bad URL or field name related to pop-up');
	};

	var solrSuccessHandler = function(data, textStatus, jqXHR)
	{
		var placeNames = [];
		placesData = [];
		for( var i=0, iEnd=data.response.docs.length; i<iEnd; i++) {
			placesData.push( data.response.docs[i] );
			data.response.docs[i].reverseName = data.response.docs[i]["n"].split(',').reverse().join(",");
		}

		//var nameSort = function(r,l) { return r.geonames_name.localeCompare(l.geonames_name); };
		var reverseNameSort = function(r,l) { return r.reverseName.localeCompare(l.reverseName); };

		placesData.sort( reverseNameSort );

		for( i=0, iEnd=placesData.length; i<iEnd; i++) {
			placeNames.push( "<option value='" + i + "'>" + placesData[i].reverseName + "  [" + placesData[i]["g"] + "]</option>" );
		}

		jQuery('#placelist').html( placeNames.join(""));
		jQuery('#errorMessage').text('');
		jQuery('#responseTime').html('Solr response time: ' + solr.solrTime + ' ms');
		jQuery('#numDocs').html('Number of docs: ' + solr.docsCount.toLocaleString());

	};

	var renderCompleteHandler = function()
	{
		if (solr.renderTime)
			$('#renderTime').html('Render time: ' + solr.renderTime + ' ms');
	};

	var keyword = jQuery('#keywordSearchText').val();
	//http://localhost:8983/solr/jstorTest
	solr = L.solrHeatmap(solrUrl, {
		// Solr field with geospatial data (should be type Spatial Recursive Prefix Tree)
		field: rptField,
		// Sorl field needed to compute nearby items
		nearbyField: nearbyField,
		nearbyFieldType: nearbyFieldType,

		// Set type of visualization. Allowed types: 'geojsonGrid', 'clusters' Note: 'clusters' requires LeafletMarkerClusterer, heatmap
		type: renderType,
		colors: colorMap, //['#000000', '#0000df', '#00effe', '#00ff42', '#feec30', '#ff5f00', '#ff0000'],
		maxSampleSize: 400,
		popupDisplay: popupDisplayField,
		// we optionally sort display of nearby items from smallest to largest
		sortField: sortField,
		solrErrorHandler: solrErrorHandler,
		solrNearbyErrorHandler: solrNearbyErrorHandler,
		solrSuccessHandler: solrSuccessHandler,
		solrNearbySuccessHandler: solrSuccessHandler,
		renderCompleteHandler: renderCompleteHandler,
		popupHighlight: true,
		showGlobalResults: showGlobalResults,
		fixedOpacity: 100,
		filterQuery: keyword,
		// Inherited from L.GeoJSON
		// onEachFeature: onEachFeature,
		//
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
	jQuery('#placelist').on("change",function () {
		var index = jQuery('#placelist').val();
		var placeData = placesData[+index];

		var latlong = placeData["g"].split(",");
		if( markerHighlight === null ) {
			markerHighlight = L.popup({
				autoPan: false
			})
			.setLatLng([+latlong[0], +latlong[1]])
			.openOn(map);
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
			.setLatLng([+latlong[0], +latlong[1]])
			.setContent(content);

	});

}

var solr = null;

resetSolr();
(function() {
	var map, solr,
		placesData = [],
		popupHighlight = null;

	//L.mapbox.accessToken = 'pk.eyJ1IjoibW9uaWNhbXMiLCJhIjoiNW4zbEtPRSJ9.9IfutzjZrHdm2ESZTmk8Sw';
	//map = L.mapbox.map('map', 'monicams.jpf4hpo5')
	map = L.map('map');

	//map.setView([39.82, -98.58], 4); // America
	map.setView([0, 0], 2); // World

	L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
	}).addTo(map);

	function onEachFeature(feature, layer) {
		//var count = feature.properties.count.toLocaleString();
		//layer.bindTooltip(count + " places").openTooltip();
		//layer.bindPopup(count);
	}

	var solrErrorHandler = function (jqXHR, textStatus, errorThrown) {
		// due to jsonp, no details are available
		jQuery('#errorMessage').text('Solr error, bad URL or RPT field name');
	};

	var solrSuccessHandler = function (data, textStatus, jqXHR) {
		var placeNames = [];
		placesData = [];
		for (var i = 0, iEnd = data.response.docs.length; i < iEnd; i++) {
			placesData.push(data.response.docs[i]);
			data.response.docs[i].reverseName = data.response.docs[i]["n"]
				.replace(/, /g,",")
				.split(',').reverse().join(", ");
		}

		//var nameSort = function(r,l) { return r.geonames_name.localeCompare(l.geonames_name); };
		var reverseNameSort = function (r, l) {
			return r.reverseName.replace(/\(/g,"").replace(/\)/g,"").replace(/\[/g,"").replace(/\]/g,"")
				.localeCompare(l.reverseName.replace(/\(/g,"").replace(/\)/g,"").replace(/\[/g,"").replace(/\]/g,""));
		};
		placesData.sort(reverseNameSort);

		for (i = 0, iEnd = placesData.length; i < iEnd; i++) {
			//placeNames.push( "<option value='" + i + "'>" + placesData[i].reverseName + "  [" + placesData[i]["g"] + "]</option>" );
			placeNames.push(['<option value="', i, '">', placesData[i].reverseName, " - [", placesData[i]["g"], "]</option>"].join(""));
		}

		jQuery('#placelist').html(placeNames.join(""));
		jQuery('#errorMessage').text('');
		jQuery('#responseTime').html('Solr response time: ' + solr.solrTime + ' ms');
		jQuery('#numDocs').html('Number of docs: ' + solr.docsCount.toLocaleString());
	};

	var renderCompleteHandler = function () {

		if (solr.renderTime) {
			$('#renderTime').html('Render time: ' + solr.renderTime + ' ms');
		}
	};

	var solrQueryCreate = function () {
		var filterVal = filter.value + "*";
		return "geonames_name:" + filterVal;
	};


	jQuery('#placelist').on("change", function () {
		var index = jQuery('#placelist').val();
		var placeData = placesData[+index];

		var latlong = placeData["g"].split(",");
		if (popupHighlight === null) {
			popupHighlight = L.popup({
				autoPan: false
			})
				.setLatLng([+latlong[0], +latlong[1]])
				.openOn(map);
		}

		var title = placeData["n"].split(",").slice(0, -1).join(", ");
		if (title.trim() === "") {
			title = placeData["n"];
		}
		var url = "http://emlo.bodleian.ox.ac.uk/profile/location/" + placeData["i"].replace("uuid_", "");

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
				: "") +
			'<a href="' + url + '" target="_blank">Link to main record</a>';

		popupHighlight
			.setLatLng([+latlong[0], +latlong[1]])
			.setContent(content);
	});

	jQuery("#filter").on( "keyup", function() {
		solr.refresh();
	});

	jQuery("#update").on( "click", function () {
		resetSolr();
	});

	jQuery("#clear").on( "click", function () {
		filter.value = "";
		solr.refresh();
	});

	function resetSolr() {
		"use strict";

		var colorMap = jQuery('#colorMap').val().split(',');

		if (solr) {
			map.removeLayer(solr);
		}

		solr = L.solrHeatmap("http://localhost:8983/solr/locations", {

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

			limitFields: [
				'g:geo',
				'n:geonames_name',
				'i:id',
				'f:ox_totalWorksSentFromPlace',
				't:ox_totalWorksSentToPlace',
				'm:ox_totalWorksMentioningPlace'
			],
			maxDocs: 10000,

			solrQueryCreate: solrQueryCreate
		})
		.addTo(map);
	}

	resetSolr();
})();
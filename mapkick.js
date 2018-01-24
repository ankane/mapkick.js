/*
 * Mapkick.js
 * Create beautiful maps with one line of JavaScript
 * https://github.com/ankane/mapkick.js
 * v0.0.1
 * MIT License
 */

/*jslint browser: true, indent: 2, plusplus: true, vars: true */

(function (window) {
  'use strict';

  var map;

  function getJSON(element, url, success) {
    ajaxCall(url, success, function (jqXHR, textStatus, errorThrown) {
      var message = (typeof errorThrown === "string") ? errorThrown : errorThrown.message;
      // TODO show message
      console.log("ERROR: " + message);
    });
  }

  function ajaxCall(url, success, error) {
    var $ = window.jQuery || window.Zepto || window.$;

    if ($) {
      $.ajax({
        dataType: "json",
        url: url,
        success: success,
        error: error
      });
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.onload = function () {
        if (xhr.status === 200) {
          success(JSON.parse(xhr.responseText), xhr.statusText, xhr);
        } else {
          error(xhr, "error", xhr.statusText);
        }
      };
      xhr.send();
    }
  }

  function onMapLoad(callback) {
    if (map.loaded()) {
      callback();
    } else {
      map.on("load", callback);
    }
  }

  function createMap(element, data, options) {
    options = options || {};
    fetchData(element, data, options, generateMap);

    if (options.refresh) {
      setInterval( function () {
        fetchData(element, data, options, updateMap);
      }, options.refresh * 1000);
    }
  }

  function fetchData(element, data, options, callback) {
    if (typeof data === "string") {
      getJSON(element, data, function (newData, status, xhr) {
        callback(element, newData, options);
      });
    } else if (typeof data === "function") {
      data( function (newData) {
        callback(element, newData, options);
      });
    } else {
      callback(element, data, options);
    }
  }

  function updateMap(element, data, options) {
    onMapLoad( function () {
      map.getSource("objects").setData(generateGeoJSON(data));
    });
  }

  function generateGeoJSON(data) {
    var geojson = {
      type: "FeatureCollection",
      features: []
    };

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var properties = Object.assign({icon: "triangle"}, row);
      geojson.features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [row.longitude || row.lng || row.lon, row.latitude || row.lat],
        },
        properties: properties
      });
    }

    return geojson;
  }

  function generateMap(element, data, options) {
    var geojson = generateGeoJSON(data);
    options = options || {};

    var bounds = new window.mapboxgl.LngLatBounds();
    geojson.features.forEach(function(feature) {
      bounds.extend(feature.geometry.coordinates);
    });

    map = new window.mapboxgl.Map({
        container: element,
        style: options.style || "mapbox://styles/mapbox/streets-v9",
        dragRotate: false,
        touchZoomRotate: false,
        center: options.center || bounds.getCenter(),
        zoom: options.zoom || 15
    });

    if (!options.zoom) {
      // hack to prevent error
      if (!map.style.stylesheet) {
        map.style.stylesheet = {};
      }
      map.fitBounds(bounds, {padding: 40, animate: false, maxZoom: 15});
    }

    onMapLoad( function () {
      map.addSource("objects", {
        type: "geojson",
        data: geojson
      });

      map.addLayer({
        id: "objects",
        source: "objects",
        type: "symbol",
        layout: {
          "icon-image": "{icon}-15",
          "text-field": "{label}",
          "text-size": 11,
          "text-anchor": "top",
          "text-offset": [0, 1]
        }
      });

      // Create a popup, but don't add it to the map yet.
      var popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 14
      });

      map.on("mouseenter", "objects", function(e) {
          // Change the cursor style as a UI indicator.
          map.getCanvas().style.cursor = "pointer";

          // Populate the popup and set its coordinates
          // based on the feature found.
          if (e.features[0].properties.tooltip) {
            popup.setLngLat(e.features[0].geometry.coordinates)
                .setText(e.features[0].properties.tooltip)
                .addTo(map);
          }
      });

      map.on("mouseleave", "objects", function() {
          map.getCanvas().style.cursor = "";
          popup.remove();
      });
    });
  }

  var Mapkick = {
    Map: function (element, data, options) {
      createMap(element, data, options);
    }
  };

  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = Mapkick;
  } else {
    window.Mapkick = Mapkick;
  }
}(window));

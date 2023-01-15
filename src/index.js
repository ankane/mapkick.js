function getElement(element) {
  if (typeof element === "string") {
    const elementId = element
    element = document.getElementById(element)
    if (!element) {
      throw new Error("No element with id " + elementId)
    }
  }
  return element
}

const maps = {}

class Map {
  constructor(element, data, options) {
    const { mapboxgl } = window

    let map
    const trails = {}
    const groupedData = {}
    const timestamps = []
    let timeIndex = 0

    element = getElement(element)

    if (element.id) {
      maps[element.id] = this
    }

    function getJSON(element, url, success) {
      const xhr = new XMLHttpRequest()
      xhr.open("GET", url, true)
      xhr.setRequestHeader("Content-Type", "application/json")
      xhr.onload = function () {
        if (xhr.status === 200) {
          success(JSON.parse(xhr.responseText))
        } else {
          showError(element, xhr.statusText)
        }
      }
      xhr.send()
    }

    function onMapLoad(callback) {
      if (map.loaded()) {
        callback()
      } else {
        map.on("load", callback)
      }
    }

    function toTimestamp(ts) {
      if (typeof ts === "number") {
        return ts
      } else {
        return (new Date(ts)).getTime() / 1000
      }
    }

    function generateReplayMap(element, data, options) {
      // group data
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const ts = toTimestamp(row.time)
        if (ts) {
          if (!groupedData[ts]) {
            groupedData[ts] = []
          }
          groupedData[ts].push(row)
          bounds.extend(rowCoordinates(row))
        }
      }

      for (const i in groupedData) {
        if (Object.prototype.hasOwnProperty.call(groupedData, i)) {
          timestamps.push(parseInt(i))
        }
      }
      timestamps.sort()

      // create map
      generateMap(element, groupedData[timestamps[timeIndex]], options)

      onMapLoad(function () {
        setTimeout(function () {
          nextFrame(element, options)
        }, 100)
      })
    }

    function nextFrame(element, options) {
      timeIndex++

      updateMap(element, groupedData[timestamps[timeIndex]], options)

      if (timeIndex < timestamps.length - 1) {
        setTimeout(function () {
          nextFrame(element, options)
        }, 100)
      }
    }

    function showError(element, message) {
      element.textContent = message
    }

    function fetchData(element, data, options, callback) {
      if (typeof data === "string") {
        getJSON(element, data, function (newData) {
          callback(element, newData, options)
        })
      } else if (typeof data === "function") {
        try {
          data(function (newData) {
            callback(element, newData, options)
          }, function (message) {
            showError(element, message)
          })
        } catch (err) {
          showError(element, "Error")
          throw err
        }
      } else {
        callback(element, data, options)
      }
    }

    function updateMap(element, data, options) {
      onLayersReady(function () {
        if (options.trail) {
          recordTrails(data, options.trail)
          map.getSource("trails").setData(generateTrailsGeoJSON(data))
        }
        map.getSource("objects").setData(generateGeoJSON(data, options))
      })
    }

    function generateGeoJSON(data, options) {
      const geojson = {
        type: "FeatureCollection",
        features: []
      }

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const properties = Object.assign({icon: options.defaultIcon || "mapkick", iconSize: options.defaultIcon ? 1 : 0.5}, row)
        geojson.features.push({
          type: "Feature",
          id: i,
          geometry: {
            type: "Point",
            coordinates: rowCoordinates(row),
          },
          properties: properties
        })
      }

      return geojson
    }

    function rowCoordinates(row) {
      return [row.longitude || row.lng || row.lon, row.latitude || row.lat]
    }

    function getTrailId(row) {
      return row.id
    }

    function recordTrails(data, trailOptions) {
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const trailId = getTrailId(row)
        if (!trails[trailId]) {
          trails[trailId] = []
        }
        trails[trailId].push(rowCoordinates(row))
        if (trailOptions && trailOptions.len && trails[trailId].length > trailOptions.len) {
          trails[trailId].shift()
        }
      }
    }

    function generateTrailsGeoJSON(data) {
      const geojson = {
        type: "FeatureCollection",
        features: []
      }

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        geojson.features.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: trails[getTrailId(row)]
          }
        })
      }

      return geojson
    }

    function addLayer(name, geojson) {
      map.addSource(name, {
        type: "geojson",
        data: geojson
      })

      // use a symbol layer for markers for performance
      // https://docs.mapbox.com/help/getting-started/add-markers/#approach-1-adding-markers-inside-a-map
      map.addLayer({
        id: name,
        source: name,
        type: "symbol",
        layout: {
          "icon-image": "{icon}-15",
          "icon-allow-overlap": true,
          "icon-size": {type: "identity", property: "iconSize"},
          "text-field": "{label}",
          "text-size": 11,
          "text-anchor": "top",
          "text-offset": [0, 1],
          "text-allow-overlap": true
        }
      })

      const hover = !("hover" in tooltipOptions) || tooltipOptions.hover

      const popupOptions = {
        closeButton: false,
        closeOnClick: false
      }
      if (!hover) {
        popupOptions.anchor = "bottom"
      }

      // create a popup
      const popup = new mapboxgl.Popup(popupOptions)

      // ensure tooltip is visible
      const panMap = function (map, popup) {
        const style = window.getComputedStyle(popup.getElement())
        const matrix = new DOMMatrixReadOnly(style.transform)
        const padding = 5
        const extra = 5
        const top = matrix.m42
        const left = matrix.m41

        // TODO add right and bottom
        if (top < padding || left < padding) {
          map.panBy([Math.min(left - padding - extra, 0), Math.min(top - padding - extra, 0)])
        }
      }

      const showPopup = function (e) {
        const tooltip = e.features[0].properties.tooltip

        if (!tooltip) {
          return
        }

        if (e.features[0].properties.icon === "mapkick") {
          popup.options.offset = {
            "top": [0, 14],
            "top-left": [0, 14],
            "top-right": [0, 14],
            "bottom": [0, -40],
            "bottom-left": [0, -40],
            "bottom-right": [0, -40],
            "left": [14, 0],
            "right": [-14, 0]
          }
        } else {
          popup.options.offset = 14
        }

        // add the tooltip
        popup.setLngLat(e.features[0].geometry.coordinates)
        if (tooltipOptions.html) {
          popup.setHTML(tooltip)
        } else {
          popup.setText(tooltip)
        }
        popup.addTo(map)

        // fix blurriness for non-retina screens
        // https://github.com/mapbox/mapbox-gl-js/pull/3258
        if (popup._container.offsetWidth % 2 !== 0) {
          popup._container.style.width = popup._container.offsetWidth + 1 + "px"
        }

        panMap(map, popup)
      }

      if (!hover) {
        let currentPoint = null

        map.on("click", name, function (e) {
          const point = e.features[0].id
          if (point !== currentPoint) {
            showPopup(e)
            currentPoint = point
            e.mapkickPopupOpened = true
          }
        })

        map.on("click", function (e) {
          if (!e.mapkickPopupOpened) {
            popup.remove()
            currentPoint = null
          }
        })
      }

      map.on("mouseenter", name, function (e) {
        const tooltip = e.features[0].properties.tooltip

        if (tooltip) {
          // Change the cursor style as a UI indicator.
          map.getCanvas().style.cursor = "pointer"

          if (hover) {
            showPopup(e)
          }
        }
      })

      map.on("mouseleave", name, function () {
        map.getCanvas().style.cursor = ""

        if (hover) {
          popup.remove()
        }
      })
    }

    function generateMap(element, data, options) {
      const geojson = generateGeoJSON(data, options)
      options = options || {}

      for (let i = 0; i < geojson.features.length; i++) {
        bounds.extend(geojson.features[i].geometry.coordinates)
      }

      // remove any child elements
      element.textContent = ""

      const mapOptions = {
        container: element,
        style: options.style || "mapbox://styles/mapbox/streets-v12",
        dragRotate: false,
        touchZoomRotate: false,
        center: options.center || bounds.getCenter(),
        zoom: options.zoom || 15
      }
      if (!options.style) {
        mapOptions.projection = "mercator"
      }
      map = new mapboxgl.Map(mapOptions)

      if (options.controls) {
        map.addControl(new mapboxgl.NavigationControl({showCompass: false}))
      }

      if (!options.zoom) {
        // hack to prevent error
        if (!map.style.stylesheet) {
          map.style.stylesheet = {}
        }
        map.fitBounds(bounds, {padding: 40, animate: false, maxZoom: 15})
      }

      onMapLoad(function () {
        if (options.trail) {
          recordTrails(data)

          map.addSource("trails", {
            type: "geojson",
            data: generateTrailsGeoJSON([])
          })

          map.addLayer({
            id: "trails",
            source: "trails",
            type: "line",
            layout: {
              "line-join": "round",
              "line-cap": "round"
            },
            paint: {
              "line-color": "#888",
              "line-width": 2
            }
          })
        }

        const scale = 2.6
        const image = new Image(20 * scale, 48 * scale)
        // from https://docs.mapbox.com/help/getting-started/add-markers/#generic-marker-images
        image.src = "data:image/svg+xml;base64,PCEtLSBDcmVhdGUgYSBjdXN0b20gbWFwIHN0eWxlOiBodHRwczovL3N0dWRpby5tYXBib3guY29tIC0tPgo8c3ZnIGlkPSJtYXJrZXIiIGRhdGEtbmFtZT0ibWFya2VyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDIwIDQ4Ij4KICA8ZyBpZD0ibWFwYm94LW1hcmtlci1pY29uIj4KICAgIDxnIGlkPSJpY29uIj4KICAgICAgPGVsbGlwc2UgaWQ9InNoYWRvdyIgY3g9IjEwIiBjeT0iMjciIHJ4PSI5IiByeT0iNSIgZmlsbD0iI2M0YzRjNCIgb3BhY2l0eT0iMC4zIiBzdHlsZT0iaXNvbGF0aW9uOiBpc29sYXRlIi8+CiAgICAgIDxnIGlkPSJtYXNrIiBvcGFjaXR5PSIwLjMiPgogICAgICAgIDxnIGlkPSJncm91cCI+CiAgICAgICAgICA8cGF0aCBpZD0ic2hhZG93LTIiIGRhdGEtbmFtZT0ic2hhZG93IiBmaWxsPSIjYmZiZmJmIiBkPSJNMTAsMzJjNSwwLDktMi4yLDktNXMtNC01LTktNS05LDIuMi05LDVTNSwzMiwxMCwzMloiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPgogICAgICAgIDwvZz4KICAgICAgPC9nPgogICAgICA8cGF0aCBpZD0iY29sb3IiIGZpbGw9IiNmODRkNGQiIHN0cm9rZT0iIzk1MTIxMiIgc3Ryb2tlLXdpZHRoPSIwLjUiIGQ9Ik0xOS4yNSwxMC40YTEzLjA2NjMsMTMuMDY2MywwLDAsMS0xLjQ2MDcsNS4yMjM1LDQxLjUyODEsNDEuNTI4MSwwLDAsMS0zLjI0NTksNS41NDgzYy0xLjE4MjksMS43MzY5LTIuMzY2MiwzLjI3ODQtMy4yNTQxLDQuMzg1OS0uNDQzOC41NTM2LS44MTM1Ljk5ODQtMS4wNzIxLDEuMzA0Ni0uMDg0NC4xLS4xNTcuMTg1Mi0uMjE2NC4yNTQ1LS4wNi0uMDctLjEzMjUtLjE1NjQtLjIxNzMtLjI1NzgtLjI1ODctLjMwODgtLjYyODQtLjc1NzEtMS4wNzIzLTEuMzE0Ny0uODg3OS0xLjExNTQtMi4wNzE0LTIuNjY2NC0zLjI1NDMtNC40MWE0Mi4yNjc3LDQyLjI2NzcsMCwwLDEtMy4yNDYzLTUuNTUzNUExMi45NzgsMTIuOTc4LDAsMCwxLC43NSwxMC40LDkuNDY1OSw5LjQ2NTksMCwwLDEsMTAsLjc1LDkuNDY1OSw5LjQ2NTksMCwwLDEsMTkuMjUsMTAuNFoiLz4KICAgICAgPHBhdGggaWQ9ImNpcmNsZSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjOTUxMjEyIiBzdHJva2Utd2lkdGg9IjAuNSIgZD0iTTEzLjU1LDEwQTMuNTUsMy41NSwwLDEsMSwxMCw2LjQ1LDMuNTQ4NCwzLjU0ODQsMCwwLDEsMTMuNTUsMTBaIi8+CiAgICA8L2c+CiAgPC9nPgogIDxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSI0OCIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4K"
        image.addEventListener("load", function () {
          map.addImage("mapkick-15", image)

          addLayer("objects", geojson)

          layersReady = true
          let cb
          while ((cb = layersReadyQueue.shift())) {
            cb()
          }
        })
      })
    }

    let layersReady = false
    const layersReadyQueue = []
    function onLayersReady(callback) {
      if (layersReady) {
        callback()
      } else {
        layersReadyQueue.push(callback)
      }
    }

    // main

    options = options || {}
    const tooltipOptions = options.tooltips || {}
    const bounds = new mapboxgl.LngLatBounds()

    if (options.replay) {
      fetchData(element, data, options, generateReplayMap)
    } else {
      fetchData(element, data, options, generateMap)

      if (options.refresh) {
        setInterval(function () {
          fetchData(element, data, options, updateMap)
        }, options.refresh * 1000)
      }
    }

    this.map = map
  }

  getMapObject() {
    return this.map
  }
}

const Mapkick = {
  Map: Map,
  maps: maps
}

// not ideal, but allows for simpler integration
if (typeof window !== "undefined" && !window.Mapkick) {
  window.Mapkick = Mapkick

  window.dispatchEvent(new Event("mapkick:load"))
}

export default Mapkick

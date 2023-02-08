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

function createMarkerImage(library, color) {
  // set height to center vertically
  const height = 41
  const width = 27
  const scale = 2

  // get marker svg
  const svg = (new library.Marker())._element.querySelector("svg")

  // make displayable and center vertically
  svg.removeAttribute("display")
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  svg.setAttribute("height", height)
  svg.setAttribute("width", width)
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`)

  // check for hex or named color
  if (!/^#([0-9a-f]{3}){1,2}$/i.test(color) && !/^[a-z]+$/i.test(color)) {
    throw new Error("Invalid color")
  }

  // set color
  svg.querySelector("*[fill='#3FB1CE']").setAttribute("fill", color)

  // add border to inner circle
  const circles = svg.querySelectorAll("circle")
  const circle = circles[circles.length - 1]
  if (circles.length == 1) {
    // need to insert new circle for mapbox-gl v2
    const c = circle.cloneNode()
    c.setAttribute("fill", "#000000")
    c.setAttribute("opacity", 0.25)
    circle.parentNode.insertBefore(c, circle)
  }
  circle.setAttribute("r", 4.5)

  // create image
  const image = new Image(width * scale, height * scale)
  image.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg.outerHTML)}`
  return image
}

const maps = {}

class BaseMap {
  constructor(element, data, options, mapType) {
    if (!Mapkick.library && typeof window !== "undefined") {
      Mapkick.library = window.mapboxgl || window.maplibregl || null
    }

    const library = Mapkick.library
    if (!library) {
      throw new Error("No mapping library found")
    }

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

    function errorCatcher(element, data, options, callback) {
      try {
        callback(element, data, options)
      } catch (err) {
        showError(element, err.message)
        throw err
      }
    }

    function fetchData(element, data, options, callback) {
      if (typeof data === "string") {
        getJSON(element, data, function (newData) {
          errorCatcher(element, newData, options, callback)
        })
      } else if (typeof data === "function") {
        data(function (newData) {
          errorCatcher(element, newData, options, callback)
        }, function (message) {
          showError(element, message)
        })
      } else {
        errorCatcher(element, data, options, callback)
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
        const properties = Object.assign({}, row)
        let geometry

        if (mapType === "point") {
          if (!properties.icon) {
            properties.icon = options.defaultIcon || "mapkick"
          }
          properties.mapkickIconSize = properties.icon === "mapkick" ? 0.5 : 1
          properties.mapkickIconAnchor = properties.icon === "mapkick" ? "bottom" : "center"
          properties.mapkickIconOffset = properties.icon === "mapkick" ? [0, 10] : [0, 0]

          const coordinates = rowCoordinates(row)

          if (!coordinates[1]) {
            throw new Error(`missing latitude (index: ${i})`)
          }

          if (!coordinates[0]) {
            throw new Error(`missing longitude (index: ${i})`)
          }

          geometry = {
            type: "Point",
            coordinates: coordinates
          }
        } else {
          geometry = row.geometry

          if (!geometry) {
            throw new Error(`missing geometry (index: ${i})`)
          }

          delete properties.geometry
        }

        geojson.features.push({
          type: "Feature",
          id: i,
          geometry: geometry,
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

    function generateLabelGeoJSON(data) {
      const geojson = {
        type: "FeatureCollection",
        features: []
      }

      for (let i = 0; i < data.features.length; i++) {
        const feature = data.features[i]
        let coordinates

        // use center for now
        const bounds = new library.LngLatBounds()
        extendBounds(bounds, feature.geometry)
        if (!bounds.isEmpty()) {
          const center = bounds.getCenter()
          coordinates = [center.lng, center.lat]
        }

        if (coordinates) {
          geojson.features.push({
            type: "Feature",
            id: i,
            geometry: {
              type: "Point",
              coordinates: coordinates
            },
            properties: feature.properties
          })
        }
      }

      return geojson
    }

    function addLayer(name, geojson) {
      const centersById = {}

      map.addSource(name, {
        type: "geojson",
        data: geojson
      })

      if (mapType === "point") {
        // use a symbol layer for markers for performance
        // https://docs.mapbox.com/help/getting-started/add-markers/#approach-1-adding-markers-inside-a-map
        // use separate layers to prevent labels from overlapping markers
        map.addLayer({
          id: `${name}-text`,
          source: name,
          type: "symbol",
          layout: {
            "text-field": "{label}",
            "text-size": 11,
            "text-anchor": "top",
            "text-offset": [0, 1]
          },
          paint: {
            "text-halo-color": "rgba(255, 255, 255, 1)",
            "text-halo-width": 1
          }
        })
        map.addLayer({
          id: name,
          source: name,
          type: "symbol",
          layout: {
            "icon-image": "{icon}-15",
            "icon-allow-overlap": true,
            "icon-size": {type: "identity", property: "mapkickIconSize"},
            "icon-anchor": {type: "identity", property: "mapkickIconAnchor"},
            "icon-offset": {type: "identity", property: "mapkickIconOffset"}
          }
        })
      } else {
        // TODO make configurable
        const fillColor = "#0090ff"

        // TODO decide which layer to place above
        map.addLayer({
          id: name,
          source: name,
          type: "fill",
          paint: {
            "fill-color": fillColor,
            "fill-opacity": 0.3
          }
        })

        map.addLayer({
          id: `${name}-outline`,
          source: name,
          type: "line",
          paint: {
            "line-color": fillColor,
            "line-opacity": 0.7,
            "line-width": 1
          }
        })

        const labelName = `${name}-text`
        const labelData = generateLabelGeoJSON(geojson)

        for (let i = 0; i < labelData.features.length; i++) {
          const feature = labelData.features[i]
          centersById[feature.id] = feature.geometry.coordinates
        }

        map.addSource(labelName, {
          type: "geojson",
          data: labelData
        })

        map.addLayer({
          id: `${name}-text`,
          source: labelName,
          type: "symbol",
          layout: {
            "text-field": "{label}",
            "text-size": 11
          },
          paint: {
            "text-halo-color": "rgba(255, 255, 255, 1)",
            "text-halo-width": 1
          }
        })
      }

      const hover = !("hover" in tooltipOptions) || tooltipOptions.hover

      const popupOptions = {
        closeButton: false,
        closeOnClick: false
      }
      if (!hover) {
        popupOptions.anchor = "bottom"
      }

      // create a popup
      const popup = new library.Popup(popupOptions)

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
        const feature = selectedFeature(e)
        const tooltip = feature.properties.tooltip

        if (!tooltip) {
          return
        }

        if (feature.properties.icon === "mapkick") {
          popup.options.offset = {
            "top": [0, 14],
            "top-left": [0, 14],
            "top-right": [0, 14],
            "bottom": [0, -44],
            "bottom-left": [0, -44],
            "bottom-right": [0, -44],
            "left": [14, 0],
            "right": [-14, 0]
          }
        } else {
          popup.options.offset = 14
        }

        let coordinates
        if (mapType === "point") {
          coordinates = feature.geometry.coordinates
        } else {
          coordinates = centersById[feature.id]
        }

        // add the tooltip
        popup.setLngLat(coordinates)
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

        if (mapType !== "area") {
          panMap(map, popup)
        }
      }

      const getLatitude = function (feature) {
        return feature.geometry.coordinates[1]
      }

      const selectedFeature = function (e) {
        const features = e.features
        let selected = features[0]
        for (let i = 1; i < features.length; i++) {
          const feature = features[i]
          // no need to handle ties since this is stable
          if (getLatitude(feature) < getLatitude(selected)) {
            selected = feature
          }
        }
        return selected
      }

      if (!hover) {
        let currentPoint = null

        map.on("click", name, function (e) {
          const point = selectedFeature(e).id
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
        const tooltip = selectedFeature(e).properties.tooltip

        if (tooltip) {
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

    function extendBounds(bounds, geometry) {
      if (geometry.type === "Point") {
        bounds.extend(geometry.coordinates)
      } else if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates[0]
        for (let j = 0; j < coordinates.length; j++) {
          bounds.extend(coordinates[j])
        }
      } else if (geometry.type === "MultiPolygon") {
        const coordinates = geometry.coordinates
        for (let j = 0; j < coordinates.length; j++) {
          const polygon = coordinates[j][0]
          for (let k = 0; k < polygon.length; k++) {
            bounds.extend(polygon[k])
          }
        }
      }
    }

    const generateMap = (element, data, options) => {
      const geojson = generateGeoJSON(data, options)
      options = options || {}

      for (let i = 0; i < geojson.features.length; i++) {
        extendBounds(bounds, geojson.features[i].geometry)
      }

      // remove any child elements
      element.textContent = ""

      let style = options.style
      if (!style) {
        const isMapLibre = !("accessToken" in library) || /^1\.1[45]/.test(library.version)
        if (isMapLibre) {
          throw new Error("style required for MapLibre")
        } else {
          style = "mapbox://styles/mapbox/streets-v12"
        }
      }

      const mapOptions = {
        container: element,
        style: style,
        dragRotate: false,
        touchZoomRotate: false,
        center: options.center || bounds.getCenter(),
        zoom: options.zoom || 15
      }
      if (!options.style) {
        mapOptions.projection = "mercator"
      }
      if (options.accessToken) {
        mapOptions.accessToken = options.accessToken
      }
      map = new library.Map(mapOptions)

      if (options.controls) {
        map.addControl(new library.NavigationControl({showCompass: false}))
      }

      if (!options.zoom) {
        // hack to prevent error
        if (!map.style.stylesheet) {
          map.style.stylesheet = {}
        }
        map.fitBounds(bounds, {padding: 40, animate: false, maxZoom: 15})
      }

      this.map = map

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

        const color = markerOptions.color || "#f84d4d"
        const image = createMarkerImage(library, color)
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
    options = Object.assign({}, Mapkick.options, options)
    const tooltipOptions = options.tooltips || {}
    const markerOptions = options.markers || {}
    const bounds = new library.LngLatBounds()

    if (options.replay) {
      fetchData(element, data, options, generateReplayMap)
    } else {
      fetchData(element, data, options, generateMap)

      if (options.refresh) {
        this.intervalId = setInterval(function () {
          fetchData(element, data, options, updateMap)
        }, options.refresh * 1000)
      }
    }
  }

  getMapObject() {
    return this.map
  }

  destroy() {
    this.stopRefresh()

    if (this.map) {
      this.map.remove()
      this.map = null
    }
  }

  stopRefresh() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}

class Map extends BaseMap {
  constructor(element, data, options) {
    super(element, data, options, "point")
  }
}

class AreaMap extends BaseMap {
  constructor(element, data, options) {
    super(element, data, options, "area")
  }
}

const Mapkick = {
  Map: Map,
  AreaMap: AreaMap,
  maps: maps,
  options: {},
  library: null
}

Mapkick.use = function (library) {
  Mapkick.library = library
}

// not ideal, but allows for simpler integration
if (typeof window !== "undefined" && !window.Mapkick) {
  window.Mapkick = Mapkick

  // use setTimeout so mapping library can come later in same JS file
  setTimeout(function () {
    window.dispatchEvent(new Event("mapkick:load"))
  }, 0)
}

export default Mapkick

# Mapkick.js

Create beautiful, interactive maps with one line of JavaScript

[View the demo](https://chartkick.com/mapkick)

For charts, check out [Chartkick.js](https://github.com/ankane/chartkick.js)

[![Build Status](https://github.com/ankane/mapkick.js/workflows/build/badge.svg?branch=master)](https://github.com/ankane/mapkick.js/actions)

## Installation

Mapkick supports Mapbox and MapLibre.

### Mapbox

First, [create a Mapbox account](https://account.mapbox.com/auth/signup/) to get an access token.

Download [mapkick.js](https://unpkg.com/mapkick) and add in the `<head>` of your HTML file:

```html
<link href="https://api.mapbox.com/mapbox-gl-js/v2.12.0/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/v2.12.0/mapbox-gl.js"></script>
<script src="mapkick.js"></script>
<script>
  mapboxgl.accessToken = "YOUR-TOKEN"
</script>
```

### MapLibre

Download [mapkick.js](https://unpkg.com/mapkick) and add in the `<head>` of your HTML file:

```html
<link href="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js"></script>
<script src="mapkick.js"></script>
<script>
  Mapkick.options = {style: "https://demotiles.maplibre.org/style.json"}
</script>
```

## Getting Started

Create a map

```html
<div id="map" style="height: 400px;"></div>

<script>
  new Mapkick.Map("map", [{latitude: 37.7829, longitude: -122.4190}])
</script>
```

## Data

Data can be an array

```javascript
new Mapkick.Map("map", [{latitude: 37.7829, longitude: -122.4190}])
```

Or a URL that returns JSON (same format as above)

```javascript
new Mapkick.Map("map", "/restaurants")
```

Or a callback

```javascript
function fetchData(success, fail) {
  success([{latitude: 37.7829, longitude: -122.4190}])
  // or fail("Data not available")
}

new Mapkick.Map("map", fetchData)
```

You can use `latitude`, `lat`, `longitude`, `lon`, and `lng`

You can specify an icon, label, and tooltip for each data point

```javascript
{
  latitude: ...,
  longitude: ...,
  icon: "restaurant",
  label: "Hot Chicken Takeover",
  tooltip: "5 stars"
}
```

[Maki icons](https://www.mapbox.com/maki-icons/) are supported (depending on the map style, only some icons may be available)

## Options

Markers

```javascript
new Mapkick.Map("map", data, {markers: {color: "#f84d4d"}}
```

Tooltips

```javascript
new Mapkick.Map("map", data, {tooltips: {hover: false, html: true}})
```

Map style

```javascript
new Mapkick.Map("map", data, {style: "mapbox://styles/mapbox/outdoors-v12"})
```

Zoom and controls

```javascript
new Mapkick.Map("map", data, {zoom: 15, controls: true})
```

### Global Options

To set options for all of your maps, use:

```javascript
Mapkick.options = {
  style: "mapbox://styles/mapbox/outdoors-v12"
}
```

## Live Updates

Refresh data periodically from a remote source to create a live map

```javascript
new Mapkick.Map("map", url, {refresh: 10}) // seconds
```

Show trails

```javascript
new Mapkick.Map("map", url, {trail: true, refresh: 10})
```

Use the `id` attribute to identify objects

```javascript
[
  {id: "bus-1", lat: ..., lon: ...},
  {id: "bus-2", lat: ..., lon: ...}
]
```

Set trail length

```javascript
new Mapkick.Map("map", url, {trail: {len: 10}, refresh: 10})
```

## Replay Data

```javascript
new Mapkick.Map("map", data, {replay: true})
```

Use the `id` attribute to identify objects and the `time` attribute for when the data was measured

```javascript
[
  {id: "bus-1", lat: ..., lon: ..., time: t0},
  {id: "bus-2", lat: ..., lon: ..., time: t0},
  {id: "bus-1", lat: ..., lon: ..., time: t1},
  {id: "bus-2", lat: ..., lon: ..., time: t1}
]
```

Times can be a `Date`, a timestamp (or sequence number), or a string (strings are parsed)

## History

View the [changelog](https://github.com/ankane/mapkick.js/blob/master/CHANGELOG.md)

## Contributing

Everyone is encouraged to help improve this project. Here are a few ways you can help:

- [Report bugs](https://github.com/ankane/mapkick.js/issues)
- Fix bugs and [submit pull requests](https://github.com/ankane/mapkick.js/pulls)
- Write, clarify, or fix documentation
- Suggest or add new features

To get started with development:

```sh
git clone https://github.com/ankane/mapkick.js.git
cd mapkick.js
npm install
npm run build
```

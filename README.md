# Mapkick.js

Create beautiful, interactive maps with one line of JavaScript

[View the demo](https://www.chartkick.com/mapkick)

## Getting Started

Create a map

```html
<div id="map" style="height: 400px"></div>

<script>
  new Mapkick.Map("map", [{latitude: 37.7829, longitude: -122.4190}])
</script>
```

## Data

Data can be an array

```javascript
new Mapkick.Map(id, [{latitude: 37.7829, longitude: -122.4190}])
```

Or a URL that returns JSON (same format as above)

```javascript
new Mapkick.Map(id, url)
```

Or a function

```javascript
function fetchData(callback) {
  callback(someData)
}
new Mapkick.Map(id, fetchData)
```

You can use `latitude`, `lat`, `longitude`, `lon`, and `lng`.

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

[Maki icons](https://www.mapbox.com/maki-icons/) are supported

## Live Updates

Refresh data periodically from a remote source to create a live map

```javascript
new Mapkick.Map(id, url, {refresh: 10}) // seconds
```

Show routes

```javascript
new Mapkick.Map(id, url, {routes: true, refresh: 10})
```

Use the `id` attribute to identify objects

```javascript
[
  {id: "bus-1", lat: ..., lon: ...},
  {id: "bus-2", lat: ..., lon: ...}
]
```

Limit route length

```javascript
new Mapkick.Map(id, url, {routes: {maxLength: 10}, refresh: 10})
```

## Replay Data

```javascript
new Mapkick.Map(id, data, {replay: true})
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

## Map Options

```javascript
{
  style: "mapbox://styles/mapbox/streets-v9",
  zoom: 15,
  defaultIcon: "default-icon",
  controls: true
}
```

## Installation

Mapkick uses [Mapbox GL JS](https://www.mapbox.com/mapbox-gl-js/api/). You must first [create a Mapbox account](https://www.mapbox.com/signup/) to get an access token.

```html
<link href="https://api.tiles.mapbox.com/mapbox-gl-js/v0.43.0/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.tiles.mapbox.com/mapbox-gl-js/v0.43.0/mapbox-gl.js"></script>
<script>
  mapboxgl.accessToken = "YOUR-TOKEN"
</script>
<script src="mapkick.js"></script>
```

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
```

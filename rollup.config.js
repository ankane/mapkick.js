import buble from "@rollup/plugin-buble";
import commonjs from "@rollup/plugin-commonjs";
import pkg from "./package.json" assert { type: "json" };
import postcss from "rollup-plugin-postcss";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

const input = "src/index.js";
const outputName = "Mapkick";
const external = Object.keys(pkg.peerDependencies || {});
const esExternal = external.concat(Object.keys(pkg.dependencies || {}));
const banner =
`/*
 * Mapkick.js v${pkg.version}
 * ${pkg.description}
 * ${pkg.repository.url}
 * ${pkg.license} License
 */
`;

const minBanner = `/*! Mapkick.js v${pkg.version} | ${pkg.license} License */`;

const bundleBanner =
`/*
 * This bundle includes:
 *
 * Mapkick.js v${pkg.version}
 * ${pkg.repository.url}
 * ${pkg.license} License
 *
 * @mapbox/geojson-rewind v0.5.0
 * https://github.com/mapbox/geojson-rewind
 * ISC License
 *
 * @mapbox/geojson-types v1.0.2
 * https://github.com/mapbox/geojson-types
 * ISC License
 *
 * @mapbox/jsonlint-lines-primitives v2.0.2
 * https://github.com/mapbox/jsonlint
 * MIT License
 *
 * @mapbox/mapbox-gl-supported v1.5.0
 * https://github.com/mapbox/mapbox-gl-supported
 * BSD-3-Clause License
 *
 * @mapbox/point-geometry v0.1.0
 * https://github.com/mapbox/point-geometry
 * ISC License
 *
 * @mapbox/tiny-sdf v1.1.1
 * https://github.com/mapbox/tiny-sdf
 * BSD-2-Clause License
 *
 * @mapbox/unitbezier v0.0.0
 * https://github.com/mapbox/unitbezier
 * BSD-2-Clause License
 *
 * @mapbox/vector-tile v1.3.1
 * https://github.com/mapbox/vector-tile-js
 * BSD-3-Clause License
 *
 * @mapbox/whoots-js v3.1.0
 * https://github.com/mapbox/whoots-js
 * ISC License
 *
 * buffer-from v1.1.1
 * https://github.com/LinusU/buffer-from
 * MIT License
 *
 * concat-stream v2.0.0
 * https://github.com/maxogden/concat-stream
 * MIT License
 *
 * csscolorparser v1.0.3
 * https://github.com/deanm/css-color-parser-js
 * MIT License
 *
 * earcut v2.2.2
 * https://github.com/mapbox/earcut
 * ISC License
 *
 * geojson-vt v3.2.1
 * https://github.com/mapbox/geojson-vt
 * ISC License
 *
 * gl-matrix v3.2.1
 * https://github.com/toji/gl-matrix
 * MIT License
 *
 * grid-index v1.1.0
 * https://github.com/mapbox/grid-index
 * ISC License
 *
 * ieee754 v1.1.13
 * https://github.com/feross/ieee754
 * BSD-3-Clause License
 *
 * inherits v2.0.4
 * https://github.com/isaacs/inherits
 * ISC License
 *
 * kdbush v3.0.0
 * https://github.com/mourner/kdbush
 * ISC License
 *
 * mapbox-gl v1.13.3
 * https://github.com/mapbox/mapbox-gl-js
 * BSD-3-Clause License
 *
 * minimist v1.2.5
 * https://github.com/substack/minimist
 * MIT License
 *
 * murmurhash-js v1.0.0
 * https://github.com/mikolalysenko/murmurhash-js
 * MIT License
 *
 * pbf v3.2.1
 * https://github.com/mapbox/pbf
 * BSD-3-Clause License
 *
 * potpack v1.0.1
 * https://github.com/mapbox/potpack
 * ISC License
 *
 * protocol-buffers-schema v3.4.0
 * https://github.com/mafintosh/protocol-buffers-schema
 * MIT License
 *
 * quickselect v2.0.0
 * https://github.com/mourner/quickselect
 * ISC License
 *
 * readable-stream v3.6.0
 * https://github.com/nodejs/readable-stream
 * MIT License
 *
 * resolve-protobuf-schema v2.1.0
 * https://github.com/mafintosh/resolve-protobuf-schema
 * MIT License
 *
 * rw v1.3.3
 * https://github.com/mbostock/rw
 * BSD-3-Clause License
 *
 * safe-buffer v5.2.0
 * https://github.com/feross/safe-buffer
 * MIT License
 *
 * string_decoder v1.3.0
 * https://github.com/nodejs/string_decoder
 * MIT License
 *
 * supercluster v7.1.0
 * https://github.com/mapbox/supercluster
 * ISC License
 *
 * tinyqueue v2.0.3
 * https://github.com/mourner/tinyqueue
 * ISC License
 *
 * typedarray v0.0.6
 * https://github.com/substack/typedarray
 * MIT License
 *
 * util-deprecate v1.0.2
 * https://github.com/TooTallNate/util-deprecate
 * MIT License
 *
 * vt-pbf v3.1.1
 * https://github.com/mapbox/vt-pbf
 * MIT License
 */
`;

const bundles = [
  {
    input: input,
    output: {
      name: outputName,
      file: pkg.main,
      format: "umd",
      banner: banner
    },
    external: external,
    plugins: [
      resolve(),
      commonjs(),
      buble()
    ]
  },
  {
    input: input,
    output: {
      name: outputName,
      file: pkg.main.replace(/\.js$/, ".min.js"),
      format: "umd",
      banner: minBanner
    },
    external: external,
    plugins: [
      resolve(),
      commonjs(),
      buble(),
      terser()
    ]
  },
  {
    input: input,
    output: {
      file: pkg.module,
      format: "es",
      banner: banner
    },
    external: esExternal,
    plugins: [
      buble()
    ]
  },
];

export default commandLineArgs => {
  if (commandLineArgs.dev !== true) {
    bundles.push({
      input: "bundle/index.js",
      output: {
        name: outputName,
        file: pkg.main.replace(/\.js$/, ".bundle.js"),
        format: "umd",
        banner: bundleBanner
      },
      external: [],
      plugins: [
        resolve(),
        commonjs(),
        postcss({plugins: []}),
        buble()
      ]
    });
  }
  delete commandLineArgs.dev;
  return bundles;
};

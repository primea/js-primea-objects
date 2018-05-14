# SYNOPSIS 
[![NPM Package](https://img.shields.io/npm/v/primea-objects.svg?style=flat-square)](https://www.npmjs.org/package/primea-objects)
[![Build Status](https://img.shields.io/travis/primea/js-primea-objects.svg?branch=master&style=flat-square)](https://travis-ci.org/primea/js-primea-objects)
[![Coverage Status](https://img.shields.io/coveralls/primea/js-primea-objects.svg?style=flat-square)](https://coveralls.io/r/primea/js-primea-objects)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)  

Object helper classes for Primea's system Objects

# INSTALL
`npm install primea-objects`

# USAGE

```javascript
const objects = require('primea-objects')

const id = new objects.ID(Buffer.from([0x1]))
const modRef = new objects.ModuleRef({'name': ['i32']}, id)
const funcRef = rmodRef.getFuncRef('name')

// all objects can be encoded to cbor with borc
const cbor = require('borc')
const encodedModRef = cbor.encode(modRef)

// and decoded with the decoder
objects.decoder.decodeFirst(encodedModRef)

```

# API
[./docs/](./docs/index.md)

# SPONSERED BY
[![](assests/dfinity.png)](www.dfinity.org)

# LICENSE
[MPL-2.0][LICENSE]

[LICENSE]: https://tldrlegal.com/license/mozilla-public-license-2.0-(mpl-2)

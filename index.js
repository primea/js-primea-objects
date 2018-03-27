const cbor = require('borc')
const EventEmitter = require('events')

const TAGS = {
  id: 41,
  link: 42,
  func: 43,
  mod: 44
}

const DEFAULTS = {
  elem: [],
  data: Buffer.from([]),
  id: new cbor.Tagged(TAGS.id, 0),
  mod: new cbor.Tagged(TAGS.mod, [{}, new cbor.Tagged(TAGS.id, 0)]),
  link: new cbor.Tagged(TAGS.link, null),
  func: new cbor.Tagged(TAGS.func, 0)
}

const decoder = new cbor.Decoder({
  tags: {
    [TAGS.id]: val => new ID(val),
    [TAGS.func]: val => new FunctionRef({
      identifier: val[0],
      params: val[1],
      id: val[2],
      gas: val[3]
    }),
    [TAGS.mod]: val => new ModuleRef(...val),
    [TAGS.link]: val => {
      return {
        '/': val
      }
    }
  }
})

class FunctionRef {
  constructor (opts) {
    this.identifier = opts.identifier
    this.destId = opts.id
    this.params = opts.params
    this.gas = opts.gas || 0
  }

  encodeCBOR (gen) {
    return gen.write(new cbor.Tagged(TAGS.func, [
      this.identifier,
      this.params,
      this.destId,
      this.gas
    ]))
  }
}

class ModuleRef {
  constructor (ex, id) {
    this.exports = ex
    this.id = id
  }

  getFuncRef (name) {
    const params = this.exports[name]

    return new FunctionRef({
      identifier: [false, name],
      params,
      id: this.id
    })
  }

  encodeCBOR (gen) {
    return gen.write(new cbor.Tagged(TAGS.mod, [this.exports, this.id]))
  }
}

class ID {
  constructor (id) {
    this.id = id
  }

  encodeCBOR (gen) {
    return gen.write(new cbor.Tagged(TAGS.id, this.id))
  }
}

/**
 * This implements Messages for Primea
 * @module primea-message
 */
class Message extends EventEmitter {
  /**
   * @param {Object} opts
   * @param {ArrayBuffer} opts.data - the payload of the message
   * @param {Array<Object>} opts.caps - an array of capabilities to send in the message
   */
  constructor (opts) {
    super()
    const defaults = this.constructor.defaults
    this._opts = Object.assign(defaults, opts)
    Object.keys(this._opts).forEach(key => {
      Object.defineProperty(this, key, {
        get: function () {
          return this._opts[key]
        },
        set: function (y) {
          this._opts[key] = y
        }
      })
    })
  }

  static get defaults () {
    return {
      ticks: 0,
      funcRef: null,
      funcArguments: [],
      funcParameters: [],
      _fromId: new ID(Buffer.alloc(20)),
      _fromTicks: 0
    }
  }
}

module.exports = {
  Message,
  ID,
  FunctionRef,
  ModuleRef,
  DEFAULTS,
  decoder
}

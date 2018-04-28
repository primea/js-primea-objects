const crypto = require('crypto')
const cbor = require('borc')
const EventEmitter = require('events')
const Buffer = require('safe-buffer').Buffer

const TAGS = {
  id: 41,
  link: 42,
  func: 43,
  mod: 44,
  actor: 45
}

/**
 * a cbor decoder for the objects
 * @type {Object}
 */
const decoder = new cbor.Decoder({
  tags: {
    [TAGS.id]: val => new ID(val),
    [TAGS.func]: val => new FunctionRef({
      identifier: val[0],
      params: val[1],
      actorID: val[2],
      gas: val[3]
    }),
    [TAGS.mod]: val => {
      const code = val.pop()['/']
      return new ModuleRef(...val, code)
    },
    [TAGS.actor]: val => new ActorRef(...val),
    [TAGS.link]: val => {
      return {
        '/': val
      }
    }
  }
})

/**
 * an ID
 */
class ID {
  /*
   * @param {Buffer} id - the id as a buffer
   */
  constructor (id) {
    this.id = id
  }

  toString () {
    return this.id.toString('hex')
  }

  toJSON () {
    return `0x${this.toString()}`
  }

  static fromJSON (data) {
    return new ID(Buffer.from(data.slice(2), 'hex'))
  }

  encodeCBOR (gen) {
    return gen.write(new cbor.Tagged(TAGS.id, this.id))
  }
}

/**
 * A function reference
 */
class FunctionRef {
  /**
   * @param {Object} opts
   * @param {Array} opts.identifier - the function's identifier
   * @param {Boolean} opts.identifier[0] - true if private function
   * @param {String} opts.identifier[1] - name of exported function, or table index if private
   * @param {ID} opts.actorID - the id of the actor
   * @param {Array} opts.params - the params of the function
   * @param {Number} opts.gas - gas amount
   */
  constructor (opts) {
    this.identifier = opts.identifier
    this.actorID = opts.actorID
    this.params = opts.params
    this.gas = opts.gas || 0
  }

  encodeCBOR (gen) {
    return gen.write(new cbor.Tagged(TAGS.func, [
      this.identifier,
      this.params,
      this.actorID,
      this.gas
    ]))
  }

  toJSON (includeParams = true) {
    const json = {
      type: getType(this),
      actorID: this.actorID.toJSON(),
      private: this.identifier[0],
      name: this.identifier[1],
      gas: this.gas
    }
    if (includeParams) {
      json.params = this.params
    }
    return json
  }

  static fromJSON (data) {
    return new FunctionRef({
      identifier: [data.private, data.name],
      actorID: ID.fromJSON(data.actorID),
      params: data.params,
      gas: data.gas
    })
  }

  /**
   * Creates a copy of the funcRef
   * @returns {FunctionRef}
   */
  copy () {
    return new FunctionRef({
      identifier: this.identifier,
      actorID: this.actorID,
      params: this.params,
      gas: this.gas
    })
  }
}

/**
 * An actor reference
 */
class ActorRef {
  /**
   * @param {ID} id - the id of the actor
   * @param {ModuleRef} modRef - the modRef of the actor
   */
  constructor (id, modRef) {
    this.modRef = modRef
    this.id = id
  }

  /**
   * return a function reference given the name of the function
   * @param {string} name
   * @returns {FunctionRef}
   */
  getFuncRef (name) {
    const params = this.modRef.exports[name]

    return new FunctionRef({
      identifier: [false, name],
      params,
      actorID: this.id
    })
  }

  toJSON (includeExports = true) {
    return {
      type: getType(this),
      id: this.id.toJSON(),
      mod: this.modRef.toJSON(includeExports)
    }
  }

  static fromJSON (data) {
    return new ActorRef(ID.fromJSON(data.id), ModuleRef.fromJSON(data.mod))
  }

  encodeCBOR (gen) {
    return gen.write(new cbor.Tagged(TAGS.actor, [this.id, this.modRef]))
  }
}

/**
 * A module reference
 */
class ModuleRef {
  /**
   * @param {ID} id - the id of the module
   * @param {Number} type - type id of the module
   * @param {Object} exports - a map of exported function to params for the function, if any
   * @param {Object} state - state of the module
   * @param {Buffer} code - code of the module
   */
  constructor (id, type, exports, state, code) {
    this.id = id
    this.type = type
    this.exports = exports
    this.state = state
    this.code = {'/': code}
  }

  toJSON (includeParams = true) {
    const json = {
      type: getType(this),
      id: this.id.toJSON(),
      modType: this.type,
      code: `0x${this.code['/'].toString('hex')}`,
      state: this.state
    }
    if (includeParams) {
      json.exports = this.exports
    }
    return json
  }

  static fromJSON (data) {
    return new ModuleRef(ID.fromJSON(data.id), data.modType, data.exports, data.state, Buffer.from(data.code.slice(2), 'hex'))
  }

  encodeCBOR (gen) {
    return gen.write(new cbor.Tagged(TAGS.mod, [this.id, this.type, this.exports, this.state, this.code]))
  }
}

/**
 * This implements Messages for Primea
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

/**
 * returns the type that the object is
 * @param {*} obj
 * @return {String}
 */
function getType (obj) {
  if (obj) {
    if (Buffer.isBuffer(obj)) {
      return 'data'
    } else if (Array.isArray(obj)) {
      return 'elem'
    } else if (obj['/']) {
      return 'link'
    } else if (obj.constructor === Message) {
      return 'message'
    } else if (obj.constructor === ID) {
      return 'id'
    } else if (obj.constructor === FunctionRef) {
      return 'func'
    } else if (obj.constructor === ModuleRef) {
      return 'mod'
    } else if (obj.constructor === ActorRef) {
      return 'actor'
    }
  }
  return 'invalid'
}

/**
 * returns the ID of an actor
 * @param {Object} id
 * @param {Number} id.nonce - the actor's nonce
 * @param {ID} id.parent - the actor's parent's ID
 * @return {ID}
 */
function generateId (id) {
  const encoded = _encodeActorId(id)
  const hashed = _hash(encoded)
  return new ID(hashed)
}

function _encodeActorId (id) {
  if (id.parent) {
    return cbor.encode([id.nonce, id.parent.id])
  } else {
    return cbor.encode([id.nonce, null])
  }
}

function _hash (buf) {
  const hash = crypto.createHash('sha256')
  hash.update(buf)
  return hash.digest().slice(0, 20)
}

module.exports = {
  Message,
  ID,
  FunctionRef,
  ModuleRef,
  ActorRef,
  decoder,
  getType,
  generateId
}

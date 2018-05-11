const { FunctionRef, ActorRef, ModuleRef, generateId, getType } = require('./')

/**
 * returns the ID of an actor, given the path
 * @param {Array} path - indexes of each actor relative to parent
 * @example [0, 1, 0] - the first child of the second child of the root actor
 * @return {ID}
 */
const actorPathToId = path => path.reduce((parent, curr) => generateId({ parent, nonce: curr }), null)

const toHex = arg => Buffer.isBuffer(arg) ? `0x${arg.toString('hex')}` : arg

const fromHex = arg => typeof arg !== 'string' ? arg : Buffer.from(arg.slice(0, 2) === '0x' ? arg.slice(2) : arg, 'hex')

const toJSON = (arg, verbose = true) => {
  switch (getType(arg)) {
    case 'elem':
      return arg.map(a => toJSON(a, verbose))
    case 'id':
    case 'func':
    case 'mod':
    case 'actor':
      return arg.toJSON(verbose)
    case 'link':
      return {
        '/': toJSON(arg['/'], verbose)
      }
    case 'data':
    default:
      return toHex(arg)
  }
}

const fromJSON = arg => {
  if (typeof arg === 'object') {
    if (Array.isArray(arg)) {
      return arg.map(fromJSON)
    }

    switch (arg.type) {
      case 'funcref':
        return FunctionRef.fromJSON(arg)
      case 'actorref':
        return ActorRef.fromJSON(arg)
      case 'modref':
        return ModuleRef.fromJSON(arg)
    }
  }

  return fromHex(arg)
}

module.exports = {
  actorPathToId,
  toJSON,
  fromJSON
}

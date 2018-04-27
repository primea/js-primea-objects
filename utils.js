const { FunctionRef, ModuleRef, generateActorId, getType } = require('./')

const actorRefToId = ref => ref.reduce((parent, curr) => generateActorId({ parent, nonce: curr }), null)

const toHex = arg => Buffer.isBuffer(arg) ? `0x${arg.toString('hex')}` : arg

const fromHex = arg => typeof arg !== 'string' ? arg : Buffer.from(arg.slice(0, 2) === '0x' ? arg.slice(2) : arg, 'hex')

const toJSON = (arg, includeOptional = true) => {
  switch (getType(arg)) {
    case 'elem':
      return arg.map(a => toJSON(a, includeOptional))
    case 'id':
    case 'func':
    case 'mod':
      return arg.toJSON(includeOptional)
    case 'link':
      return {
        '@Link': {
          '/': toJSON(arg['/'], includeOptional)
        }
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

    if (arg['@FunctionRef']) {
      return FunctionRef.fromJSON(arg)
    } else if (arg['@ModuleRef']) {
      return ModuleRef.fromJSON(arg)
    }
  }

  return fromHex(arg)
}

module.exports = {
  actorRefToId,
  toJSON,
  fromJSON,
  toHex,
  fromHex
}

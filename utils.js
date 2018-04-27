const { ID, FunctionRef, ModuleRef, generateActorId, getType } = require('./')

const actorRefToId = ref => ref.reduce((parent, curr) => generateActorId({ parent, nonce: curr }), null)

const toHex = arg => Buffer.isBuffer(arg) ? `0x${arg.toString('hex')}` : arg

const fromHex = arg => typeof arg !== 'string' ? arg : Buffer.from(arg.slice(0, 2) === '0x' ? arg.slice(2) : arg, 'hex')

const toJSON = arg => {
  switch (getType(arg)) {
    case 'elem':
      return arg.map(toJSON)
    case 'id':
      return toJSON(arg.id)
    case 'func':
      return {
        '@FunctionRef': {
          id: toJSON(arg.actorID),
          private: arg.identifier[0],
          name: arg.identifier[1],
          gas: arg.gas
        }
      }
    case 'mod':
      return {
        '@ModuleRef': {
          id: toJSON(arg.id)
        }
      }
    case 'link':
      return {
        '@Link': {
          '/': toJSON(arg['/'])
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
      const data = arg['@FunctionRef']
      return new FunctionRef({
        identifier: [data.private, data.name],
        actorID: new ID(fromJSON(data.id)),
        params: data.params,
        gas: data.gas
      })
    } else if (arg['@ModuleRef']) {
      const data = arg['@ModuleRef']
      return new ModuleRef(data.exports, new ID(fromJSON(data.id)))
    } else if (arg['@Link']) {
      const data = arg['@Link']
      return {
        '/': fromJSON(data['/'])
      }
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
